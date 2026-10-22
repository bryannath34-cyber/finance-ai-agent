#!/usr/bin/env python3
"""
scripts/test_ai_full_database_consultation.py

Comprehensive Test Suite for Full Database AI Financial Consultation & Copilot.
Verifies that:
1. AIContextService extracts complete database context (Accounts, Net Worth, Lifetime Stats,
   Monthly Cash Flow Trends, Category Spending Breakdown, Recent Transactions, Budgets, Savings Goals).
2. Context formatting produces a rich, information-dense prompt for the LLM.
3. Local analytical reasoning engine provides exact, data-backed answers without hallucination.
4. AIService.process_command routes broad financial questions to FINANCIAL_CONSULTATION.
5. PlanningService.analyze_purchase_decision includes full database context for copilot conversations.
"""

import os
import sys
from decimal import Decimal
from unittest.mock import MagicMock, patch

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

# Stub packages if needed
for mod in [
    "pydantic", "pydantic_settings", "fastapi", "passlib", "passlib.context",
    "mysql", "mysql.connector", "mysql.connector.pooling", "pymysql", "pymysql.cursors",
    "dbutils", "dbutils.pooled_db"
]:
    if mod not in sys.modules:
        m = MagicMock()
        if mod == "pydantic":
            class MockBaseModel:
                def __init__(self, **kwargs):
                    for k, v in kwargs.items():
                        setattr(self, k, v)
            m.BaseModel = MockBaseModel
            m.Field = lambda *args, **kwargs: None
        elif mod == "pydantic_settings":
            class MockBaseSettings:
                def __init__(self, **kwargs):
                    self.APP_PREFIX = "/finance"
                    self.SESSION_COOKIE_NAME = "pf_session"
                    self.CSRF_COOKIE_NAME = "pf_csrf"
                    self.APP_BASE_URL = "https://161.118.216.250"
                    self.PASSWORD_RESET_EXPIRE_MINUTES = 60
                    self.SESSION_EXPIRE_HOURS = 24
                    self.ALLOWED_HOSTS = "*"
                    self.SECRET_KEY = "mock_secret_key"
                    self.DB_HOST = "127.0.0.1"
                    self.DB_PORT = 3306
                    self.DB_USER = "mock_user"
                    self.DB_PASSWORD = "mock_password"
                    self.DB_NAME = "mock_db"
                    for k, v in kwargs.items():
                        setattr(self, k, v)
            m.BaseSettings = MockBaseSettings
            m.SettingsConfigDict = lambda *args, **kwargs: None
        sys.modules[mod] = m

from app.services.ai_context_service import AIContextService, _format_idr
from app.services.ai_service import AIService
from app.services.planning_service import PlanningService


def get_mock_database_context():
    """Generates a realistic full database financial context for testing."""
    return {
        "user_id": 1,
        "as_of_date": "2026-10-22",
        "accounts": [
            {"id": 1, "name": "Kas Tunai", "type": "CASH", "balance": Decimal("350000"), "balance_formatted": "Rp 350.000"},
            {"id": 2, "name": "Bank BCA", "type": "BANK", "balance": Decimal("15000000"), "balance_formatted": "Rp 15.000.000"},
            {"id": 3, "name": "GoPay", "type": "EWALLET", "balance": Decimal("500000"), "balance_formatted": "Rp 500.000"}
        ],
        "total_net_worth": Decimal("15850000"),
        "lifetime_stats": {
            "total_income": Decimal("45000000"),
            "total_expense": Decimal("29150000"),
            "net_savings": Decimal("15850000"),
            "transaction_count": 85
        },
        "monthly_history": [
            {
                "period": "2026-10", "year": 2026, "month": 10,
                "income": Decimal("12000000"), "expense": Decimal("6500000"),
                "net": Decimal("5500000"), "savings_rate_pct": 45.8
            },
            {
                "period": "2026-09", "year": 2026, "month": 9,
                "income": Decimal("12000000"), "expense": Decimal("5200000"),
                "net": Decimal("6800000"), "savings_rate_pct": 56.7
            }
        ],
        "current_month_stats": {
            "period": "2026-10", "year": 2026, "month": 10,
            "income": Decimal("12000000"), "expense": Decimal("6500000"),
            "net": Decimal("5500000"), "savings_rate_pct": 45.8
        },
        "category_spending_this_month": [
            {"category": "Makanan & Minuman", "total_spent": Decimal("3200000"), "formatted": "Rp 3.200.000", "percentage": 49.2, "tx_count": 28},
            {"category": "Transportasi", "total_spent": Decimal("1500000"), "formatted": "Rp 1.500.000", "percentage": 23.1, "tx_count": 14},
            {"category": "Belanja", "total_spent": Decimal("1200000"), "formatted": "Rp 1.200.000", "percentage": 18.5, "tx_count": 5},
            {"category": "Tagihan & Utilitas", "total_spent": Decimal("600000"), "formatted": "Rp 600.000", "percentage": 9.2, "tx_count": 3}
        ],
        "category_spending_all_time": [
            {"category": "Makanan & Minuman", "total_spent": Decimal("14000000"), "formatted": "Rp 14.000.000", "percentage": 48.0, "tx_count": 120},
            {"category": "Transportasi", "total_spent": Decimal("6500000"), "formatted": "Rp 6.500.000", "percentage": 22.3, "tx_count": 60}
        ],
        "recent_transactions": [
            {"id": 102, "date": "2026-10-22", "type": "EXPENSE", "amount": Decimal("17000"), "category": "Makanan & Minuman", "source_account": "Kas Tunai", "destination_account": None, "description": "Beli jus alpukat", "is_reversal": False},
            {"id": 101, "date": "2026-10-22", "type": "EXPENSE", "amount": Decimal("25000"), "category": "Makanan & Minuman", "source_account": "Kas Tunai", "destination_account": None, "description": "Beli nasi padang", "is_reversal": False},
            {"id": 100, "date": "2026-10-21", "type": "EXPENSE", "amount": Decimal("150000"), "category": "Transportasi", "source_account": "Bank BCA", "destination_account": None, "description": "Bensin mobil Pertamax", "is_reversal": False},
            {"id": 99, "date": "2026-10-20", "type": "INCOME", "amount": Decimal("12000000"), "category": "Gaji", "source_account": None, "destination_account": "Bank BCA", "description": "Gaji Bulanan", "is_reversal": False}
        ],
        "budget_overview": {
            "total_limit": Decimal("8000000"),
            "total_spent": Decimal("6500000"),
            "remaining": Decimal("1500000"),
            "percentage_used": 81.3,
            "category_limits": [
                {"category_name": "Makanan & Minuman", "limit": Decimal("4000000"), "spent": Decimal("3200000"), "remaining": Decimal("800000"), "percentage_used": 80.0}
            ]
        },
        "savings_goals": [
            {
                "name": "Dana Darurat 6 Bulan",
                "target_amount": Decimal("30000000"),
                "current_balance": Decimal("15000000"),
                "dedicated_account": "Bank BCA",
                "target_date": "2027-04-01",
                "status": "ACTIVE",
                "progress_pct": 50.0,
                "is_achieved": False
            }
        ]
    }


def test_ai_database_consultation():
    print("=" * 70)
    print("RUNNING AUTOMATED TEST: FULL DATABASE AI FINANCIAL CONSULTATION")
    print("=" * 70)

    mock_ctx = get_mock_database_context()

    # -----------------------------------------------------------------
    # TEST 1: Context Formatting for LLM Prompt
    # -----------------------------------------------------------------
    print("\n=== TEST 1: Context Formatting for LLM ===")
    prompt_context = AIContextService.format_context_for_prompt(mock_ctx)
    assert "TOTAL KEKAYAAN BERSIH (NET WORTH): Rp 15.850.000" in prompt_context
    assert "Bank BCA (BANK): Rp 15.000.000" in prompt_context
    assert "Makanan & Minuman: Rp 3.200.000 (49.2%" in prompt_context
    assert "Batas Anggaran Total: Rp 8.000.000" in prompt_context
    assert "Dana Darurat 6 Bulan" in prompt_context
    assert "Beli jus alpukat" in prompt_context
    print(" [PASS] Prompt context successfully includes all accounts, budgets, categories, and real transactions.")

    # -----------------------------------------------------------------
    # TEST 2: Local Rule-Based Analysis Engine (Deterministic Fallback)
    # -----------------------------------------------------------------
    print("\n=== TEST 2: Local Analytical Engine (Zero Hallucination) ===")
    # 2a: Query top expense category
    res_top = AIContextService.generate_rule_based_financial_analysis(mock_ctx, "kategori apa yang paling boros bulan ini?")
    assert "Makanan & Minuman" in res_top
    assert "Rp 3.200.000" in res_top
    assert "49.2%" in res_top
    print(" [PASS] Test 2a: 'Paling boros' correctly identifies top category with exact Rp amount & percentage.")

    # 2b: Query month-over-month comparison
    res_compare = AIContextService.generate_rule_based_financial_analysis(mock_ctx, "kenapa pengeluaran gua bulan ini naik dibanding bulan lalu?")
    assert "Rp 6.500.000" in res_compare  # cur month
    assert "Rp 5.200.000" in res_compare  # prev month
    assert "Rp 1.300.000" in res_compare  # diff
    assert "meningkat" in res_compare
    print(" [PASS] Test 2b: Month-over-month comparison computes exact difference and direction.")

    # 2c: Query specific category
    res_food = AIContextService.generate_rule_based_financial_analysis(mock_ctx, "berapa total pengeluaran makanan gua?")
    assert "Makanan & Minuman" in res_food
    assert "Rp 3.200.000" in res_food
    assert "28 kali" in res_food
    print(" [PASS] Test 2c: Specific category spending query retrieves total, frequency, and transaction details.")

    # 2d: Query savings goals
    res_goals = AIContextService.generate_rule_based_financial_analysis(mock_ctx, "progres target tabungan gua gimana?")
    assert "Dana Darurat 6 Bulan" in res_goals
    assert "Rp 15.000.000" in res_goals
    assert "50.0%" in res_goals
    print(" [PASS] Test 2d: Savings goal progress retrieved with exact percentage and dedicated account.")

    # 2e: Specific Date Transaction Query (22 Oktober 2026 -> 2 expenses totaling Rp 42.000)
    res_date = AIContextService.generate_rule_based_financial_analysis(mock_ctx, "khusus tanggal 22 oktober aja berapa pengeluaran gua?")
    assert "22 Oktober 2026" in res_date
    assert "Rp 42.000" in res_date
    assert "2 transaksi" in res_date
    assert "Beli jus alpukat" in res_date
    assert "Rp 17.000" in res_date
    assert "Beli nasi padang" in res_date
    assert "Rp 25.000" in res_date
    print(" [PASS] Test 2e: Date-specific query for 22 Oktober returns exact Rp 42.000 sum and 2 items.")

    # 2f: Date Parsing Variations
    from datetime import date
    d1 = AIContextService.parse_date_from_text("khusus tanggal 22 oktober aja berapa pengeluaran gua?")
    assert d1 == date(2026, 10, 22), f"Expected 2026-10-22, got {d1}"
    d2 = AIContextService.parse_date_from_text("beli 2 burger tanggal 22 oktober")
    assert d2 == date(2026, 10, 22), f"Expected 2026-10-22, got {d2}"
    d3 = AIContextService.parse_date_from_text("pengeluaran 22 okt 2026")
    assert d3 == date(2026, 10, 22), f"Expected 2026-10-22, got {d3}"
    d4 = AIContextService.parse_date_from_text("transaksi 22/10/2026")
    assert d4 == date(2026, 10, 22), f"Expected 2026-10-22, got {d4}"
    print(" [PASS] Test 2f: Date parser handles various natural language formats accurately.")

    # -----------------------------------------------------------------
    # TEST 3: AIService.process_command Full Consultation Routing
    # -----------------------------------------------------------------
    print("\n=== TEST 3: AIService.process_command Omnichannel Routing ===")
    mock_accounts = [
        {"id": 1, "name": "Kas Tunai", "type": "CASH", "current_balance": Decimal("350000"), "is_active": True},
        {"id": 2, "name": "Bank BCA", "type": "BANK", "current_balance": Decimal("15000000"), "is_active": True}
    ]
    with patch.object(AIContextService, "get_user_financial_context", return_value=mock_ctx), \
         patch("app.services.finance_service.FinanceService.get_accounts_with_balance", return_value=mock_accounts):
        # 3a: Broad consultation question
        res_cmd1 = AIService.process_command(1, "kategori apa yang paling boros bulan ini?")
        assert res_cmd1["intent"] == "FINANCIAL_CONSULTATION"
        assert res_cmd1["items_count"] == 0
        assert "Makanan & Minuman" in res_cmd1["ai_response"]
        print(" [PASS] Test 3a: Broad question correctly classified as FINANCIAL_CONSULTATION.")

        # 3b: Comparison query
        res_cmd2 = AIService.process_command(1, "bandingkan pengeluaran bulan ini sama bulan lalu")
        assert res_cmd2["intent"] == "FINANCIAL_CONSULTATION"
        assert "Rp 1.300.000" in res_cmd2["ai_response"]
        print(" [PASS] Test 3b: Comparison query routed to full database consultation.")

        # 3c: Advice on increasing savings
        res_cmd3 = AIService.process_command(1, "gimana cara naikin tabungan dari riwayat transaksi gua?")
        assert res_cmd3["intent"] == "FINANCIAL_CONSULTATION"
        assert "Kekayaan Bersih" in res_cmd3["ai_response"] or "Arus Kas" in res_cmd3["ai_response"]
        print(" [PASS] Test 3c: Savings advice query routed to full database consultation.")

        # 3d: Date-specific inquiry via main command
        res_cmd4 = AIService.process_command(1, "khusus tanggal 22 oktober aja berapa pengeluaran gua?")
        assert res_cmd4["intent"] == "FINANCIAL_INQUIRY"
        assert "Rp 42.000" in res_cmd4["ai_response"]
        assert "Beli jus alpukat" in res_cmd4["ai_response"]
        assert "Beli nasi padang" in res_cmd4["ai_response"]
        print(" [PASS] Test 3d: Date query via omnibar returns exact Rp 42.000 and itemized transactions.")

    # -----------------------------------------------------------------
    # TEST 4: PlanningService.analyze_purchase_decision Context Integration
    # -----------------------------------------------------------------
    print("\n=== TEST 4: PlanningService Full Database Context Integration ===")
    mock_accounts = [
        {"id": 1, "name": "Kas Tunai", "type": "CASH", "current_balance": Decimal("350000"), "is_active": True},
        {"id": 2, "name": "Bank BCA", "type": "BANK", "current_balance": Decimal("15000000"), "is_active": True}
    ]
    with patch.object(AIContextService, "get_user_financial_context", return_value=mock_ctx), \
         patch("app.services.finance_service.FinanceService.get_accounts_with_balance", return_value=mock_accounts), \
         patch.object(PlanningService, "get_budget_overview", return_value={"total_limit": Decimal("8000000"), "total_spent": Decimal("6500000"), "total_remaining": Decimal("1500000")}), \
         patch.object(PlanningService, "get_savings_goals", return_value=mock_ctx["savings_goals"]):
        
        # 4a: General strategy conversation in copilot tab
        adv1 = PlanningService.analyze_purchase_decision(1, "bagaimana evaluasi keuangan gua secara menyeluruh?")
        assert adv1["is_purchase"] is False
        assert "Makanan & Minuman" in adv1["advice"] or "Kekayaan Bersih" in adv1["advice"]
        print(" [PASS] Test 4a: PlanningService incorporates full database context in copilot advisory conversations.")

        # 4b: Date-specific expense query in copilot tab (Must NOT be treated as purchase Rp 22!)
        adv2 = PlanningService.analyze_purchase_decision(1, "khusus tanggal 22 oktober aja berapa pengeluaran gua?")
        assert adv2["is_purchase"] is False, "Date query must NOT be classified as a purchase decision!"
        assert adv2["estimated_cost"] == Decimal("0.00"), f"Cost should be 0, got {adv2['estimated_cost']}"
        assert adv2["verdict"] == "INFORMASI_DATABASE", f"Expected INFORMASI_DATABASE, got {adv2['verdict']}"
        assert adv2["verdict_badge"] == "📊 Riwayat Transaksi Database", f"Expected Riwayat Transaksi Database, got {adv2['verdict_badge']}"
        assert adv2["scenario_id"] is None, "Inquiry must not be recorded as purchase scenario in DB!"
        assert "Rp 42.000" in adv2["advice"], f"Expected Rp 42.000 in advice, got: {adv2['advice']}"
        assert "Beli jus alpukat" in adv2["advice"], f"Expected Beli jus alpukat in advice, got: {adv2['advice']}"
        assert "Beli nasi padang" in adv2["advice"], f"Expected Beli nasi padang in advice, got: {adv2['advice']}"
        print(" [PASS] Test 4b: Date query in copilot tab correctly classified as INFORMASI_DATABASE with Rp 42.000 and 2 items.")

        # 4c: Real purchase intent remains correctly classified as purchase
        adv3 = PlanningService.analyze_purchase_decision(1, "bisa beli sepatu 750rb gak?")
        assert adv3["is_purchase"] is True
        assert adv3["estimated_cost"] == Decimal("750000")
        assert "Aman" in adv3["verdict_badge"] or "Relatif" in adv3["verdict_badge"]
        print(" [PASS] Test 4c: Real purchase request correctly classified as purchase with exact Rp 750.000.")

    print("\n" + "=" * 70)
    print("ALL 4 FULL DATABASE CONSULTATION TEST SUITES PASSED (100% GREEN)!")
    print("=" * 70)


if __name__ == "__main__":
    test_ai_database_consultation()
