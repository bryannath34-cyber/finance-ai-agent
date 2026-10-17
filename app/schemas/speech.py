from typing import Optional
from pydantic import BaseModel

class SpeechJobResponse(BaseModel):
    success: bool = True
    job_id: str
    message: str = "Audio berhasil diterima. Job transkripsi sedang diproses di OCI Speech."

class SpeechStatusResponse(BaseModel):
    job_id: str
    status: str  # PENDING, IN_PROGRESS, SUCCEEDED, FAILED, TIMEOUT
    transcript: Optional[str] = None
    error_message: Optional[str] = None
