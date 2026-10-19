from typing import Optional
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username pengguna")
    password: str = Field(..., min_length=6, description="Password pengguna")
    totp_code: Optional[str] = Field(None, min_length=6, max_length=6, description="Kode TOTP saat 2FA aktif")

class TwoFactorEnableRequest(BaseModel):
    secret: str = Field(..., min_length=16, max_length=64)
    code: str = Field(..., min_length=6, max_length=6)

class TwoFactorDisableRequest(BaseModel):
    password: str = Field(..., min_length=6)
    code: str = Field(..., min_length=6, max_length=6)

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)

class UpdateProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)

class UserProfile(BaseModel):
    id: int
    username: str
    full_name: str
    timezone: str

class LoginResponse(BaseModel):
    success: bool = True
    message: str = "Login berhasil"
    user: UserProfile
    data: Optional[UserProfile] = None
    csrf_token: str
    token: Optional[str] = None
