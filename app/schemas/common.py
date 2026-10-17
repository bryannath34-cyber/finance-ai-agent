from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

T = TypeVar("T")

class BaseResponse(BaseModel):
    success: bool = True
    message: str = "Sukses"

class DataResponse(BaseResponse, Generic[T]):
    data: Optional[T] = None

class HealthResponse(BaseModel):
    status: str
    database: str
    app_prefix: str
    version: str = "2.3.0"
