import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.core.security import get_current_user
from app.schemas.common import DataResponse
from app.schemas.speech import SpeechJobResponse, SpeechStatusResponse
from app.services.speech_service import SpeechService

router = APIRouter(prefix="/speech", tags=["Speech Engine"])

MAX_AUDIO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

@router.post("/transcribe", response_model=SpeechJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def transcribe_audio(
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Menerima rekaman suara browser (WebM/Opus), konversi ke WAV 16kHz, dan mendaftarkan job ke OCI Speech:
    - Ukuran maksimal: 5 MB (durasi ideal ~30 detik)
    - Asinkron: mengembalikan job_id untuk dipolling oleh antarmuka web
    """
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Ukuran audio melebihi batas maksimal 5 MB.")

    if len(audio_bytes) < 1000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ukuran audio terlalu kecil atau rekaman kosong.")

    file_ext = os.path.splitext(audio.filename or "")[1] or ".webm"
    job_id = SpeechService.submit_speech_job(user["id"], audio_bytes, file_ext)

    return SpeechJobResponse(
        success=True,
        job_id=job_id,
        message="Rekaman suara berhasil diterima dan diteruskan ke OCI Speech (Whisper Medium)."
    )

@router.get("/jobs/{job_id}", response_model=DataResponse[SpeechStatusResponse])
def get_transcription_job_status(job_id: str, user: dict = Depends(get_current_user)):
    """
    Polling status transkripsi OCI Speech (Polling interval 2-3 detik dari frontend).
    Saat SUCCEEDED, teks hasil transkripsi dikembalikan dan audio sementara dibersihkan dari storage.
    """
    status_data = SpeechService.get_job_status(user["id"], job_id)
    return DataResponse(
        success=True,
        message="Status transkripsi diperoleh.",
        data=SpeechStatusResponse(
            job_id=status_data["job_id"],
            status=status_data["status"],
            transcript=status_data["transcript"],
            error_message=status_data["error_message"]
        )
    )
