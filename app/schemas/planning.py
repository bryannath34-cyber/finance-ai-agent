from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, Field

# ==========================================
# 1. Anggaran Bulanan & Limit Kategori
# ==========================================
class MonthlyBudgetSetRequest(BaseModel):
    period_year: int = Field(..., ge=2024, le=2050)
    period_month: int = Field(..., ge=1, le=12)
    limit_amount: Decimal = Field(..., gt=0)

class CategoryBudgetSetRequest(BaseModel):
    category_id: int = Field(..., gt=0)
    period_year: int = Field(..., ge=2024, le=2050)
    period_month: int = Field(..., ge=1, le=12)
    limit_amount: Decimal = Field(..., gt=0)

class CategoryBudgetItem(BaseModel):
    category_id: int
    category_name: str
    limit_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    percentage_spent: float
    is_over: bool

class BudgetOverviewResponse(BaseModel):
    period_year: int
    period_month: int
    total_limit: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    percentage_spent: float
    is_over: bool
    categories: List[CategoryBudgetItem]

# ==========================================
# 2. Target Tabungan (Savings Goals)
# ==========================================
class SavingsGoalCreate(BaseModel):
    dedicated_account_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=2, max_length=100)
    target_amount: Decimal = Field(..., gt=0)
    target_date: Optional[date] = None

class SavingsGoalItem(BaseModel):
    id: int
    dedicated_account_id: int
    account_name: str
    name: str
    target_amount: Decimal
    current_balance: Decimal
    target_date: Optional[date] = None
    status: str
    progress_percent: float
    is_achieved: bool
    created_at: datetime

class UpdateGoalStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|ACHIEVED|CANCELLED)$")

# ==========================================
# 3. AI Financial Copilot & Advisory
# ==========================================
class PurchaseAdviceRequest(BaseModel):
    query: str = Field(..., min_length=5, max_length=500, description="Pertanyaan pembelian, misal: 'Gue mau beli keyboard Rp760rb pake Bank, aman gak?'")
    target_account_id: Optional[int] = None

class PurchaseAdviceResponse(BaseModel):
    item_name: str
    estimated_cost: Decimal
    verdict: str  # AMAN / PERLU_PERTIMBANGAN / BERISIKO
    verdict_badge: str
    advice: str
    financial_snapshot: Dict[str, Any]
    scenario_id: Optional[int] = None

class PurchaseScenarioItem(BaseModel):
    id: int
    item_name: str
    estimated_cost: Decimal
    target_account_name: Optional[str] = None
    ai_summary_advice: str
    financial_snapshot: Dict[str, Any]
    user_decision: str
    created_at: datetime

class SpendingPatternResponse(BaseModel):
    current_month_str: str
    previous_month_str: str
    current_month_spent: Decimal
    previous_month_spent: Decimal
    diff_amount: Decimal
    percentage_change: float
    category_comparisons: List[Dict[str, Any]]
    ai_summary: str

# ==========================================
# 4. Laporan & Diagram Realtime (Analytics)
# ==========================================
class MonthlyCashflowItem(BaseModel):
    year: int
    month: int
    month_label: str
    income: Decimal
    expense: Decimal
    net_cashflow: Decimal

class CategoryCompositionItem(BaseModel):
    category_name: str
    spent_amount: Decimal
    percentage: float

class MonthlyHistoryItem(BaseModel):
    period_str: str
    year: int
    month: int
    income: Decimal
    expense: Decimal
    net_cashflow: Decimal
    expense_change_percent: float

class DailySpendingItem(BaseModel):
    date_str: str
    day_label: str
    spent_amount: Decimal

class FinancialReportsResponse(BaseModel):
    period_year: int
    period_month: int
    current_income: Decimal
    current_expense: Decimal
    current_net: Decimal
    savings_rate: float
    income_count: int
    expense_count: int
    prev_month_expense: Decimal
    expense_change_percent: float
    monthly_cashflow: List[MonthlyCashflowItem]
    category_composition: List[CategoryCompositionItem]
    monthly_history: List[MonthlyHistoryItem]
    daily_spending: List[DailySpendingItem]
    sparkline_points: List[Decimal]
    sparkline_months: List[str]

