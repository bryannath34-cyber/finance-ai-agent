/**
 * Personal Finance AI Agent - Audio Recorder v2.3
 * Captures microphone stream via browser MediaRecorder API with 30s max duration limit.
 */

export class AudioRecorder {
  constructor(options = {}) {
    this.maxDurationSeconds = options.maxDurationSeconds || 30;
    this.onStateChange = options.onStateChange || (() => {});
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.timeoutId = null;
    this.isRecording = false;
  }

  async start() {
    if (this.isRecording) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Gagal mengakses mikrofon:", err);
      throw new Error("Izin akses mikrofon ditolak atau mikrofon tidak tersedia.");
    }

    // Determine supported mimeType
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    }

    this.audioChunks = [];
    this.mediaRecorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    return new Promise((resolve) => {
      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        this.onStateChange(true);

        // Safety limit: auto-stop after maxDurationSeconds
        this.timeoutId = setTimeout(() => {
          if (this.isRecording) {
            this.stop().catch(console.error);
          }
        }, this.maxDurationSeconds * 1000);

        resolve();
      };

      this.mediaRecorder.start(250); // collect in chunks
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        return resolve(null);
      }

      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        // Clean up stream tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        this.isRecording = false;
        this.onStateChange(false);
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (err) => {
        this.isRecording = false;
        this.onStateChange(false);
        reject(err);
      };

      this.mediaRecorder.stop();
    });
  }
}
