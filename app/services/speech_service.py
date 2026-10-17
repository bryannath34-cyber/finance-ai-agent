import os
import uuid
import json
import logging
import subprocess
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import oci
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger("personal_finance.speech_service")

# In-Memory Job Registry (Dictionary per job_id)
_jobs_registry: Dict[str, Dict[str, Any]] = {}

_signer = None
_os_client = None
_speech_client = None

def get_oci_clients():
    global _signer, _os_client, _speech_client
    if _signer is None:
        try:
            _signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
            _os_client = oci.object_storage.ObjectStorageClient(
                config={"region": settings.OCI_REGION_APP},
                signer=_signer
            )
            _speech_client = oci.ai_speech.AIServiceSpeechClient(
                config={"region": settings.OCI_REGION_APP},
                signer=_signer
            )
            logger.info("OCI Speech & Object Storage Client terhubung di %s", settings.OCI_REGION_APP)
        except Exception as e:
            logger.error("Gagal inisialisasi OCI Clients: %s", e)
    return _os_client, _speech_client

class SpeechService:
    @staticmethod
    def convert_to_wav_16k(input_path: str, output_path: str) -> bool:
        """Mengonversi berkas audio (WebM/Opus/MP4) menjadi format WAV PCM 16kHz Mono."""
        ffmpeg_bin = settings.FFMPEG_PATH if os.path.exists(settings.FFMPEG_PATH) else "ffmpeg"
        cmd = [
            ffmpeg_bin,
            "-y",
            "-i", input_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            output_path
        ]
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error("Konversi FFmpeg gagal: %s", e.stderr.decode(errors="ignore"))
            return False
        except FileNotFoundError:
            logger.error("Binary ffmpeg tidak ditemukan di sistem!")
            return False

    @staticmethod
    def submit_speech_job(user_id: int, audio_bytes: bytes, file_ext: str = ".webm") -> str:
        """
        Alur asinkron OCI Speech:
        1. Simpan audio sementara di /tmp
        2. Konversi ke WAV 16kHz Mono via ffmpeg
        3. Upload WAV ke Object Storage (audio-in/)
        4. Submit batch job ke OCI Speech (Whisper Medium, language_code='id')
        5. Simpan metadata di registry
        """
        os_client, speech_client = get_oci_clients()
        if not os_client or not speech_client:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Layanan OCI Cloud Speech belum siap.")

        job_id = str(uuid.uuid4())
        raw_tmp_path = f"/tmp/{job_id}{file_ext}"
        wav_tmp_path = f"/tmp/{job_id}.wav"
        object_name = f"audio-in/{job_id}.wav"

        # Simpan file sementara
        with open(raw_tmp_path, "wb") as f:
            f.write(audio_bytes)

        # Konversi ke WAV 16kHz
        converted = SpeechService.convert_to_wav_16k(raw_tmp_path, wav_tmp_path)
        if not converted:
            if os.path.exists(raw_tmp_path):
                os.remove(raw_tmp_path)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gagal memproses format audio. Pastikan file valid.")

        try:
            # Upload ke Object Storage
            with open(wav_tmp_path, "rb") as wav_file:
                os_client.put_object(
                    namespace_name=settings.OCI_BUCKET_NAMESPACE,
                    bucket_name=settings.OCI_BUCKET_NAME,
                    object_name=object_name,
                    put_object_body=wav_file.read()
                )
            logger.info("Audio uji '%s' berhasil diunggah ke Object Storage.", object_name)

            # Submit Job OCI Speech Whisper Medium
            speech_models = oci.ai_speech.models
            job_details = speech_models.CreateTranscriptionJobDetails(
                compartment_id=settings.OCI_COMPARTMENT_OCID,
                input_location=speech_models.ObjectListInlineInputLocation(
                    location_type="OBJECT_LIST_INLINE_INPUT_LOCATION",
                    object_locations=[
                        speech_models.ObjectLocation(
                            namespace_name=settings.OCI_BUCKET_NAMESPACE,
                            bucket_name=settings.OCI_BUCKET_NAME,
                            object_names=[object_name]
                        )
                    ]
                ),
                output_location=speech_models.OutputLocation(
                    namespace_name=settings.OCI_BUCKET_NAMESPACE,
                    bucket_name=settings.OCI_BUCKET_NAME,
                    prefix="audio-out/"
                ),
                model_details=speech_models.TranscriptionModelDetails(
                    domain="GENERIC",
                    language_code="id",
                    model_type="WHISPER_MEDIUM"
                )
            )

            job_resp = speech_client.create_transcription_job(job_details)
            oci_job_id = job_resp.data.id

            # Simpan di in-memory job registry
            _jobs_registry[job_id] = {
                "user_id": user_id,
                "oci_job_id": oci_job_id,
                "object_name": object_name,
                "status": "IN_PROGRESS",
                "transcript": None,
                "error": None,
                "created_at": datetime.now(timezone.utc)
            }

            logger.info("OCI Speech Job dibuat: OCID %s untuk App Job %s", oci_job_id, job_id)
            return job_id

        finally:
            # Bersihkan file lokal /tmp
            if os.path.exists(raw_tmp_path):
                os.remove(raw_tmp_path)
            if os.path.exists(wav_tmp_path):
                os.remove(wav_tmp_path)

    @staticmethod
    def get_job_status(user_id: int, job_id: str) -> Dict[str, Any]:
        """
        Memeriksa status transkripsi OCI Speech secara asinkron.
        Melakukan active cleanup objek audio setelah transkripsi selesai.
        """
        job = _jobs_registry.get(job_id)
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job transkripsi tidak ditemukan.")

        # Validasi kepemilikan tenant (Anti-IDOR)
        if job["user_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak: bukan pemilik job.")

        if job["status"] in ("SUCCEEDED", "FAILED", "TIMEOUT"):
            return {
                "job_id": job_id,
                "status": job["status"],
                "transcript": job["transcript"],
                "error_message": job["error"]
            }

        os_client, speech_client = get_oci_clients()
        oci_job_id = job["oci_job_id"]

        try:
            oci_res = speech_client.get_transcription_job(oci_job_id)
            state = oci_res.data.lifecycle_state

            if state == "SUCCEEDED":
                # Cari dan unduh hasil JSON dari prefix audio-out/
                prefix = f"audio-out/{settings.OCI_BUCKET_NAMESPACE}_{settings.OCI_BUCKET_NAME}_{job['object_name'].replace('/', '_')}"
                # Cari objek output di Object Storage
                list_objs = os_client.list_objects(
                    namespace_name=settings.OCI_BUCKET_NAMESPACE,
                    bucket_name=settings.OCI_BUCKET_NAME,
                    prefix="audio-out/"
                )

                transcript_text = ""
                output_obj_names = []
                for obj in list_objs.data.objects:
                    if oci_job_id in obj.name or job_id in obj.name:
                        output_obj_names.append(obj.name)
                        if obj.name.endswith(".json"):
                            try:
                                get_out = os_client.get_object(
                                    namespace_name=settings.OCI_BUCKET_NAMESPACE,
                                    bucket_name=settings.OCI_BUCKET_NAME,
                                    object_name=obj.name
                                )
                                out_json = json.loads(get_out.data.content.decode("utf-8"))
                                # Format struktur Whisper OCI Speech
                                if "transcriptions" in out_json and out_json["transcriptions"]:
                                    transcript_text = out_json["transcriptions"][0].get("transcription", "")
                                elif "audio_segments" in out_json:
                                    transcript_text = " ".join([seg.get("text", "") for seg in out_json["audio_segments"]])
                            except Exception as ex:
                                logger.warning("Gagal membaca hasil JSON OCI Speech: %s", ex)

                job["status"] = "SUCCEEDED"
                job["transcript"] = transcript_text.strip()

                # Active Cleanup: Hapus audio-in dan file JSON output
                try:
                    os_client.delete_object(settings.OCI_BUCKET_NAMESPACE, settings.OCI_BUCKET_NAME, job["object_name"])
                    for out_name in output_obj_names:
                        os_client.delete_object(settings.OCI_BUCKET_NAMESPACE, settings.OCI_BUCKET_NAME, out_name)
                    logger.info("Active cleanup berhasil untuk Job %s", job_id)
                except Exception as clean_err:
                    logger.warning("Gagal active cleanup OCI Storage: %s", clean_err)

            elif state in ("FAILED", "CANCELED"):
                job["status"] = "FAILED"
                job["error"] = "Transkripsi OCI Speech gagal diproses."
                try:
                    os_client.delete_object(settings.OCI_BUCKET_NAMESPACE, settings.OCI_BUCKET_NAME, job["object_name"])
                except Exception:
                    pass

            return {
                "job_id": job_id,
                "status": job["status"],
                "transcript": job["transcript"],
                "error_message": job["error"]
            }

        except Exception as e:
            logger.error("Gagal memeriksa status OCI Speech Job: %s", e)
            return {
                "job_id": job_id,
                "status": "IN_PROGRESS",
                "transcript": None,
                "error_message": str(e)
            }
