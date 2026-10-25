import os
import sys
import json
from types import SimpleNamespace
sys.path.insert(0, os.path.abspath("."))
from unittest.mock import MagicMock
from decimal import Decimal

# Stub optional runtime packages if not installed in current python environment
for mod in ["pydantic", "pydantic_settings", "fastapi", "passlib", "passlib.context", "mysql", "mysql.connector", "mysql.connector.pooling", "pymysql", "pymysql.cursors", "dbutils", "dbutils.pooled_db"]:
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
                    self.APP_PREFIX = ""
                    self.SESSION_COOKIE_NAME = "pf_session"
                    self.CSRF_COOKIE_NAME = "pf_csrf"
                    self.OCI_COMPARTMENT_OCID = None
                    self.OCI_GENAI_ENDPOINT = ""
                    self.OCI_GENAI_MODEL_ID = ""
                    self.OCI_REGION_GENAI = "ap-osaka-1"
                    for k, v in kwargs.items():
                        setattr(self, k, v)
            m.BaseSettings = MockBaseSettings
            m.SettingsConfigDict = lambda *args, **kwargs: None
        sys.modules[mod] = m

# Test 1: Schemas
def test_auth_schema():
    from app.schemas.auth import LoginResponse, UserProfile
    profile = UserProfile(id=1, username="test", full_name="Test User", timezone="Asia/Jakarta")
    resp = LoginResponse(user=profile, csrf_token="csrf123", token="sess_token_abc")
    assert resp.token == "sess_token_abc", "LoginResponse should contain token field"
    print(" [PASS] Test 1: LoginResponse schema includes token field")

# Test 2: Security Bearer Token Support
def test_security_bearer_support():
    from app.core.security import verify_csrf
    from fastapi import Request
    
    # Request with Bearer token
    req_bearer = MagicMock()
    req_bearer.method = "POST"
    req_bearer.url.path = "/api/transactions"
    req_bearer.headers = {"Authorization": "Bearer session_token_123"}
    req_bearer.cookies = {}
    
    # verify_csrf should not raise exception for Bearer token requests
    try:
        verify_csrf(req_bearer)
        print(" [PASS] Test 2: verify_csrf allows requests with Authorization: Bearer")
    except Exception as e:
        assert False, f"verify_csrf failed on Bearer auth: {e}"

# Test 3: Security CSRF Exclusion for AI Parse
def test_security_ai_parse_csrf():
    from app.core.security import verify_csrf
    
    req_ai = MagicMock()
    req_ai.method = "POST"
    req_ai.url.path = "/api/ai/parse"
    req_ai.headers = {}
    req_ai.cookies = {}
    
    try:
        verify_csrf(req_ai)
        print(" [PASS] Test 3: verify_csrf allows requests to /api/ai/parse without CSRF token")
    except Exception as e:
        assert False, f"verify_csrf failed on /api/ai/parse: {e}"

# Test 4: AI Command Processing Fallback / Robustness
def test_ai_service_commands():
    from app.services.ai_service import AIService
    from app.services.finance_service import FinanceService
    from unittest.mock import patch
    
    mock_accounts = [
        {"id": 1, "name": "BCA", "type": "BANK", "current_balance": Decimal("5000000"), "is_active": True},
        {"id": 2, "name": "GoPay", "type": "EWALLET", "current_balance": Decimal("250000"), "is_active": True},
        {"id": 3, "name": "Kas Tunai", "type": "CASH", "current_balance": Decimal("100000"), "is_active": True}
    ]
    mock_categories = [
        {"id": 1, "name": "Gaji & Pendapatan", "type": "INCOME", "is_active": True},
        {"id": 2, "name": "Saldo Awal", "type": "INCOME", "is_active": True},
        {"id": 3, "name": "Makanan & Minuman", "type": "EXPENSE", "is_active": True},
        {"id": 4, "name": "Transportasi", "type": "EXPENSE", "is_active": True}
    ]
    
    from app.services.transaction_service import TransactionService

    mock_saved_drafts = []
    def fake_create_drafts(uid, drafts):
        mock_saved_drafts.clear()
        for d in drafts:
            mock_saved_drafts.append({
                "type": d["type"],
                "amount": d["amount"],
                "admin_fee": d.get("admin_fee", Decimal("0.00")),
                "destination_account_name": "BCA",
                "category_name": "Saldo Awal",
                "description": d.get("description", "")
            })
        return "batch-test-123"

    with patch.object(FinanceService, "get_accounts_with_balance", return_value=mock_accounts), \
         patch.object(FinanceService, "get_categories", return_value=mock_categories), \
         patch.object(TransactionService, "create_batch_drafts", side_effect=fake_create_drafts), \
         patch.object(TransactionService, "get_batch_drafts", side_effect=lambda uid, bid: mock_saved_drafts):
        
        # Test 4a: Inquiry (tanya saldo)
        res_inquiry = AIService.process_command(1, "saldo gua sekarang berapa?")
        assert res_inquiry["intent"] == "FINANCIAL_INQUIRY", f"Expected FINANCIAL_INQUIRY, got {res_inquiry['intent']}"
        assert "5.350.000" in res_inquiry["ai_response"], f"Saldo total harus terhitung: {res_inquiry['ai_response']}"
        print(" [PASS] Test 4a: AI Financial Inquiry (saldo gua sekarang berapa?)")
        
        # Test 4b: Saldo masuk BCA 8jt
        res_bal = AIService.process_command(1, "di rekening bca gua ada 8jt")
        assert res_bal["intent"] == "TRANSACTION_DRAFT"
        assert len(res_bal["drafts"]) > 0
        d = res_bal["drafts"][0]
        assert d["type"] == "INCOME"
        assert d["amount"] == Decimal("8000000")
        assert "bca" in (d.get("destination_account_name") or "").lower() or "bank" in (d.get("destination_account_name") or "").lower()
        print(" [PASS] Test 4b: AI Balance Statement Draft (di rekening bca gua ada 8jt -> INCOME 8.000.000)")
        
        # Test 4c: Capability query
        res_cap = AIService.process_command(1, "kamu bisa apa aja?")
        assert res_cap["intent"] == "CAPABILITY"
        print(" [PASS] Test 4c: AI Capability help message")

        # Test 4d: successful OCI-style model response is parsed and saved as draft
        import app.services.ai_service as ai_module
        llm_payload = [{
            "type": "EXPENSE", "amount": 35000, "admin_fee": 0,
            "source_account_name": "GoPay", "destination_account_name": None,
            "category_name": "Makanan & Minuman", "description": "Makan siang",
            "transaction_date": "2026-10-19"
        }]
        fake_models = SimpleNamespace(
            BaseChatRequest=SimpleNamespace(API_FORMAT_COHERE="COHERE"),
            CohereChatRequest=lambda **kwargs: SimpleNamespace(**kwargs),
            ChatDetails=lambda **kwargs: SimpleNamespace(**kwargs),
            OnDemandServingMode=lambda **kwargs: SimpleNamespace(**kwargs),
        )
        fake_oci = SimpleNamespace(generative_ai_inference=SimpleNamespace(models=fake_models))
        fake_client = SimpleNamespace(chat=lambda details: SimpleNamespace(
            data=SimpleNamespace(chat_response=SimpleNamespace(text=json.dumps(llm_payload)))
        ))
        with patch.object(ai_module, "oci", fake_oci), \
             patch.object(ai_module, "get_genai_client", return_value=fake_client), \
             patch.object(ai_module.settings, "OCI_COMPARTMENT_OCID", "test-compartment"), \
             patch.object(TransactionService, "create_batch_drafts", return_value="oci-mock-batch"), \
             patch.object(TransactionService, "get_batch_drafts", return_value=[{"id": 44, **llm_payload[0]}]):
            res_llm = AIService.parse_finance_text(1, "beli makan 35rb pake gopay")
        assert res_llm["batch_id"] == "oci-mock-batch"
        assert res_llm["drafts"][0]["amount"] == Decimal("35000")
        print(" [PASS] Test 4d: OCI-style LLM response becomes a validated transaction draft")

        # Test 4e: Multi-clause fallback parser with explicit dates
        long_multi_text = (
            "Pada tanggal 1 Oktober 2026 gue mengeluarkan duit untuk Shopee PayLater sebesar 16.320.000 "
            "dan tanggal 2 Oktober gue menggunakan pengeluaran flash card sebesar 10.000, "
            "terus tanggal 3 Oktober kebab 25.000"
        )
        parsed_clauses = AIService._fallback_regex_parser(long_multi_text, mock_accounts, mock_categories)
        assert len(parsed_clauses) == 3, f"Expected 3 drafts from multi-clause input, got {len(parsed_clauses)}: {parsed_clauses}"
        assert parsed_clauses[0]["amount"] == Decimal("16320000"), f"Clause 1 amount mismatch: {parsed_clauses[0]}"
        assert parsed_clauses[0]["transaction_date"] == "2026-10-01", f"Clause 1 date mismatch: {parsed_clauses[0]}"
        assert parsed_clauses[1]["amount"] == Decimal("10000"), f"Clause 2 amount mismatch: {parsed_clauses[1]}"
        assert parsed_clauses[1]["transaction_date"] == "2026-10-02", f"Clause 2 date mismatch: {parsed_clauses[1]}"
        assert parsed_clauses[2]["amount"] == Decimal("25000"), f"Clause 3 amount mismatch: {parsed_clauses[2]}"
        assert parsed_clauses[2]["transaction_date"] == "2026-10-03", f"Clause 3 date mismatch: {parsed_clauses[2]}"
        print(" [PASS] Test 4e: Multi-clause fallback parser splits long texts and extracts distinct dates")


# Test 5: index.html DOM structure check
def test_index_html_dom():
    with open("app/static/index.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    assert '<div id="tab-dashboard" class="tab-content active">' in html, "tab-dashboard must be active by default"
    assert '<div id="tab-mutasi" class="tab-content">' in html, "tab-mutasi must not have active class by default"
    assert '<div id="auth-overlay" class="desktop-login-overlay" style="display: none;">' in html, "auth-overlay must have display: none;"
    assert '<button type="button" class="sidebar-nav-btn active" data-tab="tab-dashboard">' in html, "Dashboard button must have active class in sidebar"
    assert '<button type="button" class="sidebar-nav-btn" data-tab="tab-mutasi">' in html, "Mutasi button must not have active class in sidebar"
    print(" [PASS] Test 5: index.html DOM active tab and hidden auth-overlay verification")

# Test 6: app.js dashboard switch on login/showDashboard
def test_app_js_logic():
    with open("app/static/js/app.js", "r", encoding="utf-8") as f:
        js = f.read()
    
    assert "this.switchTab('tab-dashboard');" in js, "showDashboard must call this.switchTab('tab-dashboard')"
    assert "mobile-btn-report-view-all" in js, "mobile-btn-report-view-all must be wired"
    assert ".user-profile-badge" in js, "user-profile-badge must be wired"
    assert "e.target.closest('#btn-parse')" in js, "AI submit must be delegated early during app initialization"
    assert "const verified = await api.auth.getMe();" in js, "Login must verify its newly issued session"
    logout_start = js.index("async handleLogout()")
    logout_end = js.index("async loadInitialData()", logout_start)
    logout_handler = js[logout_start:logout_end]
    assert "if (this.logoutInProgress) return;" in logout_handler, "logout must be idempotent"
    assert logout_handler.index("await api.auth.logout()") < logout_handler.index("this.showLogin();"), "wait for server logout cookie response before showing login"
    assert "this.btnLogout.addEventListener('click'" not in js, "logout buttons must not be double-bound"
    assert "berhasil didaftarkan!" not in js, "unimplemented signup must not claim success"
    assert "Instruksi pemulihan telah dikirim" not in js, "unimplemented password reset must not claim success"
    print(" [PASS] Test 6: app.js showDashboard routing and button listeners verification")

# Test 7: api.js dual-channel bearer token
def test_api_js_logic():
    with open("app/static/js/api.js", "r", encoding="utf-8") as f:
        js = f.read()
        
    assert "localStorage.getItem('pf_token')" in js, "api.js must read pf_token from localStorage"
    assert "headers['Authorization'] = `Bearer ${bearerToken}`;" in js, "api.js must attach Bearer header"
    assert "localStorage.setItem('pf_token', res.token);" in js, "api.js must store pf_token on login"
    print(" [PASS] Test 7: api.js Dual-channel Bearer token attachment and persistence")

# Test 8: required deployment secrets are never supplied as source defaults
def test_config_requires_secrets():
    with open("app/core/config.py", "r", encoding="utf-8") as f:
        config = f.read()

    assert "SECRET_KEY: str\n" in config, "SECRET_KEY must be required from deployment environment"
    assert "DB_PASSWORD: str\n" in config, "DB_PASSWORD must be required from deployment environment"
    assert "ChangeThisToARandom32CharSecretKey1234567890!" not in config
    assert "FinAppSecret2026!#Oci" not in config
    print(" [PASS] Test 8: deployment signing key and DB password have no code defaults")

# Test 9: Auth backward compatibility & login resilience
def test_auth_backward_compatibility():
    with open("app/api/auth.py", "r", encoding="utf-8") as f:
        auth_py = f.read()
    assert "SELECT *" in auth_py and "FROM app_users" in auth_py, "auth.py login must use SELECT * to remain backward compatible with unmigrated DB"
    assert "totp_secret_ciphertext" not in auth_py.split("SELECT *")[1].split("FROM app_users")[0], "auth.py login query must not require totp columns in SELECT list"

    with open("app/static/js/app.js", "r", encoding="utf-8") as f:
        app_js = f.read()
    # Check that checkSession doesn't hide login form
    check_session_start = app_js.index("async checkSession()")
    check_session_end = app_js.index("showSessionCheckError()", check_session_start)
    assert "this.showLogin();" in app_js[check_session_start:check_session_end], "checkSession must call showLogin on failure"
    assert "this.currentUser = verifiedProfile || userProfile" in app_js, "handleLogin must fall back to userProfile if getMe stutters"
    print(" [PASS] Test 9: Auth backward compatibility and login form resilience verified")

# Test 10: AI Financial Copilot and Advisory Resilience
def test_advisory_copilot():
    from app.core.security import verify_csrf
    from app.schemas.planning import PurchaseAdviceRequest
    
    # 1. verify_csrf allows /api/planning/advisory/purchase without CSRF token
    req = MagicMock()
    req.method = "POST"
    req.url.path = "/api/planning/advisory/purchase"
    req.headers = {}
    req.cookies = {}
    verify_csrf(req)

    # 2. Schema accepts short and long queries
    req_schema = PurchaseAdviceRequest(query="beli hp")
    assert req_schema.query == "beli hp"

    # 3. ai_service triggers advisory intent on consulting queries
    with open("app/services/ai_service.py", "r", encoding="utf-8") as f:
        ai_py = f.read()
    assert "penasehat" in ai_py and "aman ga" in ai_py, "ai_service.py must include extended advisory triggers"
    assert "adv_res.get(\"financial_snapshot\"" in ai_py, "ai_service.py must read real financial_snapshot from planning_service"

    # 4. planning_service checks cost > 0 before inserting to purchase_scenarios
    with open("app/services/planning_service.py", "r", encoding="utf-8") as f:
        plan_py = f.read()
    assert "if cost > 0 and target_acc" in plan_py, "planning_service must check cost > 0 and target_acc to avoid DB check constraint violation"
    print(" [PASS] Test 10: AI Financial Copilot and Advisory resilience verified")

# Test 11: Long Text Input Limits & Error Handling
def test_long_text_limits_and_error_handling():
    # 1. ai schema max_length verification
    with open("app/schemas/ai.py", "r", encoding="utf-8") as f:
        ai_schema_code = f.read()
    assert "max_length=20000" in ai_schema_code, "ParseTextRequest must permit texts up to 20000 chars"

    # 2. planning schema max_length verification
    with open("app/schemas/planning.py", "r", encoding="utf-8") as f:
        planning_schema_code = f.read()
    assert "max_length=10000" in planning_schema_code, "PurchaseAdviceRequest must permit query up to 10000 chars"
    assert "max_length=5000" in planning_schema_code, "AdvisorConversationMessage must permit content up to 5000 chars"

    # 3. ai_service max_tokens and timeout safety verification
    with open("app/services/ai_service.py", "r", encoding="utf-8") as f:
        ai_service_code = f.read()
    assert "max_tokens=2500" in ai_service_code, "AIService must request up to 2500 tokens for fast long batches"
    assert "concurrent.futures.ThreadPoolExecutor" in ai_service_code, "AIService must wrap OCI call in ThreadPoolExecutor for timeout safety"

    # 4. api.js array error handling and 120s timeout verification
    with open("app/static/js/api.js", "r", encoding="utf-8") as f:
        api_js_code = f.read()
    assert "Array.isArray(data.detail)" in api_js_code, "api.js must parse validation error array detail"
    assert "data.detail.map(" in api_js_code, "api.js must format validation error details into readable strings"
    assert "timeout: 120000" in api_js_code, "api.ai.parse must configure 120000ms timeout for long text AI processing"
    assert "options.timeout || 60000" in api_js_code, "api.js default request timeout must be at least 60000ms"
    print(" [PASS] Test 11: Long text input limits (20k chars), array validation error, and 120s AI timeout verified")

# Test 12: Modernized Dashboard Structure & Widget Removal
def test_modernized_dashboard():
    with open("app/static/index.html", "r", encoding="utf-8") as f:
        html = f.read()

    # 1. AI Textarea removed from Dashboard (desktop & mobile)
    dash_tab_end = html.index('id="tab-planning"')
    dash_html = html[:dash_tab_end]
    assert 'class="dashboard-ai-entry"' not in dash_html, "AI entry textarea must be removed from desktop dashboard"
    assert 'class="mobile-fcard mobile-ai-entry-card"' not in dash_html, "AI entry card must be removed from mobile dashboard"

    # 2. Rekening & Kantong Dana removed from Dashboard (desktop & mobile)
    assert 'id="accounts-container"' not in dash_html, "accounts-container must be removed from dashboard"
    assert 'id="savings-goals-mini-list"' not in dash_html, "savings-goals-mini-list must be removed from dashboard"
    assert 'id="mobile-accounts-list"' not in dash_html, "mobile-accounts-list must be removed from mobile dashboard"

    # 3. Fake badges removed from KPI cards
    assert '+12%' not in dash_html, "Fake +12% badge must be removed"
    assert '-2%' not in dash_html, "Fake -2% badge must be removed"
    assert '+20%' not in dash_html, "Fake +20% badge must be removed"
    assert '8,2% dari bulan lalu' not in dash_html, "Fake 8,2% delta badge must be removed from mobile dashboard"

    # 4. Top spending card and safe daily spend added
    assert 'id="dashboard-top-spending-list"' in dash_html, "dashboard-top-spending-list must be present on desktop dashboard"
    assert 'id="mobile-top-spending-list"' in dash_html, "mobile-top-spending-list must be present on mobile dashboard"
    assert 'id="summary-daily-safe-spend"' in dash_html, "summary-daily-safe-spend must be present on desktop surplus card"
    assert 'id="mobile-daily-safe-spend"' in dash_html, "mobile-daily-safe-spend must be present on mobile summary card"

    # 5. AI Financial Copilot Insight card present on desktop dashboard
    assert 'ai-insight-card' in dash_html, "ai-insight-card must be present on desktop dashboard sidebar"
    assert 'id="btn-quick-consult-ai"' in dash_html, "btn-quick-consult-ai must be present in AI Copilot card"

    # 6. app.js logic verification
    with open("app/static/js/app.js", "r", encoding="utf-8") as f:
        js = f.read()
    assert "renderDashboardTopCategories()" in js, "app.js must implement renderDashboardTopCategories()"
    assert "if (this.accountsContainer)" in js, "app.js renderAccounts must check if this.accountsContainer is present"
    assert "this.summaryDailySafeSpend" in js, "app.js must bind this.summaryDailySafeSpend"
    assert "this.btnDashMainCreateTx" in js, "app.js must bind this.btnDashMainCreateTx"
    print(" [PASS] Test 12: Modernized Dashboard verified (AI textarea removed, Rekening & Kantong removed, fake badges removed, Top Spending & Safe Daily Spend added)")

if __name__ == "__main__":
    print("\n================== RUNNING UNIT & INTEGRATION TESTS ==================")
    test_auth_schema()
    test_security_bearer_support()
    test_security_ai_parse_csrf()
    test_ai_service_commands()
    test_index_html_dom()
    test_app_js_logic()
    test_api_js_logic()
    test_config_requires_secrets()
    test_auth_backward_compatibility()
    test_advisory_copilot()
    test_long_text_limits_and_error_handling()
    test_modernized_dashboard()
    print("================== ALL 12 TEST SUITES PASSED (100% GREEN) ==================\n")




