from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.common import DataResponse
from app.schemas.ai import ParseTextRequest, LLMParseResult
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Engine"])

@router.post("/parse", response_model=DataResponse[LLMParseResult])
def parse_financial_text(payload: ParseTextRequest, user: dict = Depends(get_current_user)):
    """
    Asisten Finansial AI Omnichannel:
    - Menjawab pertanyaan saldo, kondisi keuangan, atau pengeluaran
    - Memberikan pertimbangan kelayakan belanja & konsultasi finansial
    - Mengekstrak mutasi & pencatatan saldo ke draft transaksi
    """
    res = AIService.process_command(user["id"], payload.text)
    return DataResponse(
        success=True,
        message=res.get("message") or "Berhasil memproses perintah AI.",
        data=LLMParseResult(
            batch_id=res.get("batch_id"),
            items_count=res.get("items_count", 0),
            drafts=res.get("drafts", []),
            intent=res.get("intent", "TRANSACTION_DRAFT"),
            ai_response=res.get("ai_response"),
            advisory=res.get("advisory")
        )
    )
