from typing import Optional
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username pengguna")
    password: str = Field(..., min_length=6, description="Password pengguna")

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
