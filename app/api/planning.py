from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from app.core.security import get_current_user
from app.schemas.common import DataResponse, BaseResponse
from app.schemas.planning import (
    MonthlyBudgetSetRequest,
    CategoryBudgetSetRequest,
    BudgetOverviewResponse,
    SavingsGoalCreate,
    SavingsGoalItem,
    UpdateGoalStatusRequest,
    PurchaseAdviceRequest,
    PurchaseAdviceResponse,
    PurchaseScenarioItem,
    SpendingPatternResponse,
)
from app.services.planning_service import PlanningService

router = APIRouter(prefix="/planning", tags=["Planning & AI Advisory"])

# =============================================================================
# 1. ANGGARAN BULANAN
# =============================================================================
@router.get("/budget", response_model=DataResponse[BudgetOverviewResponse])
def get_budget_overview(
    year: Optional[int] = Query(None, ge=2024, le=2050),
    month: Optional[int] = Query(None, ge=1, le=12),
    user: dict = Depends(get_current_user)
):
    """Mengambil ikhtisar anggaran bulanan dan limit kategori terkini."""
    data = PlanningService.get_budget_overview(user["id"], year, month)
    return DataResponse(success=True, message="Ikhtisar anggaran berhasil dimuat.", data=data)

@router.post("/budget", response_model=BaseResponse)
def set_monthly_budget(payload: MonthlyBudgetSetRequest, user: dict = Depends(get_current_user)):
    """Menetapkan pagu anggaran total bulanan."""
    res = PlanningService.set_monthly_budget(
        user["id"], payload.period_year, payload.period_month, payload.limit_amount
    )
    return BaseResponse(success=True, message=res["message"])

@router.post("/budget/category", response_model=BaseResponse)
def set_category_budget(payload: CategoryBudgetSetRequest, user: dict = Depends(get_current_user)):
    """Menetapkan pagu batas per kategori pengeluaran."""
    res = PlanningService.set_category_budget(
        user["id"], payload.category_id, payload.period_year, payload.period_month, payload.limit_amount
    )
    return BaseResponse(success=True, message=res["message"])

# =============================================================================
# 2. TARGET TABUNGAN
# =============================================================================
@router.get("/goals", response_model=DataResponse[List[SavingsGoalItem]])
def list_savings_goals(user: dict = Depends(get_current_user)):
    """Mengambil seluruh target tabungan dengan persentase progres real-time."""
    goals = PlanningService.get_savings_goals(user["id"])
    return DataResponse(success=True, message="Daftar target tabungan berhasil dimuat.", data=goals)

@router.post("/goals", response_model=BaseResponse)
def create_savings_goal(payload: SavingsGoalCreate, user: dict = Depends(get_current_user)):
    """Membuat target tabungan baru yang terikat pada rekening kantong dana khusus."""
    res = PlanningService.create_savings_goal(
        user["id"], payload.dedicated_account_id, payload.name, payload.target_amount, payload.target_date
    )
    return BaseResponse(success=True, message=res["message"])

@router.patch("/goals/{goal_id}/status", response_model=BaseResponse)
def update_goal_status(goal_id: int, payload: UpdateGoalStatusRequest, user: dict = Depends(get_current_user)):
    """Mengubah status target tabungan (ACTIVE / ACHIEVED / CANCELLED)."""
    res = PlanningService.update_goal_status(user["id"], goal_id, payload.status)
    return BaseResponse(success=True, message=res["message"])

# =============================================================================
# 3. AI FINANCIAL COPILOT & ADVISORY
# =============================================================================
@router.post("/advisory/purchase", response_model=DataResponse[PurchaseAdviceResponse])
def analyze_purchase_decision(payload: PurchaseAdviceRequest, user: dict = Depends(get_current_user)):
    """
    Analisis Keputusan Pembelian Cerdas (Decision Copilot):
    - Mengambil saldo rekening, sisa anggaran bulan berjalan, dan progres tabungan.
    - Python menghitung dampak pembelian; OCI GenAI (Cohere Osaka) memberikan penalaran risiko objektif.
    - Tersimpan otomatis ke memori purchase_scenarios.
    """
    res = PlanningService.analyze_purchase_decision(
        user["id"], payload.query, payload.target_account_id
    )
    return DataResponse(success=True, message="Analisis keputusan pembelian selesai.", data=res)

@router.get("/advisory/scenarios", response_model=DataResponse[List[PurchaseScenarioItem]])
def list_purchase_scenarios(limit: int = Query(10, ge=1, le=50), user: dict = Depends(get_current_user)):
    """Mengambil riwayat konsultasi skenario pembelian terdahulu."""
    scenarios = PlanningService.get_purchase_scenarios(user["id"], limit=limit)
    return DataResponse(success=True, message="Riwayat skenario pembelian diperoleh.", data=scenarios)

@router.get("/advisory/spending-patterns", response_model=DataResponse[SpendingPatternResponse])
def analyze_spending_patterns(user: dict = Depends(get_current_user)):
    """
    Detektif Pola Pengeluaran:
    Membandingkan mutasi bulan berjalan dengan bulan sebelumnya per kategori, dijelaskan narasi AI.
    """
    res = PlanningService.analyze_spending_patterns(user["id"])
    return DataResponse(success=True, message="Analisis pola pengeluaran berhasil.", data=res)
