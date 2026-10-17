from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.common import DataResponse
from app.schemas.ai import ParseTextRequest, LLMParseResult
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Engine"])

@router.post("/parse", response_model=DataResponse[LLMParseResult])
def parse_financial_text(payload: ParseTextRequest, user: dict = Depends(get_current_user)):
    """
    Menganalisis kalimat mutasi keuangan menggunakan model OCI GenAI (Cohere Command A):
    - Memecah multi-transaksi dalam satu kalimat
    - Memetakan nama rekening dan kategori ke ID database pengguna
    - Menyimpan hasilnya sebagai batch draft sementara berdurasi 15 menit
    """
    res = AIService.parse_finance_text(user["id"], payload.text)
    return DataResponse(
        success=True,
        message=f"Berhasil mengekstrak {res['items_count']} draft transaksi.",
        data=LLMParseResult(
            batch_id=res["batch_id"],
            items_count=res["items_count"],
            drafts=res["drafts"]
        )
    )
