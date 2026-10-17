from pydantic import BaseModel, Field

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Nama kategori")
    type: str = Field(..., pattern="^(INCOME|EXPENSE)$", description="Tipe kategori: INCOME atau EXPENSE")

class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    is_system: bool
    is_active: bool
