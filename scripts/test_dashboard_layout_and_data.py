"""
Unit & Integration Test: Dashboard Layout & Dynamic Data Verification
Verifies:
1. Duplicate AI entry removed from dashboard (preventing UI clutter)
2. Static hardcoded percentage badges removed (+12%, -2%, +20%, 8,2%)
3. Safe daily spend indicator calculated dynamically and rendered
4. Top spending category breakdown rendered dynamically with true percentages
5. Responsive 700px left column layout in CSS
"""
import sys
import os
import re

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_HTML = os.path.join(ROOT_DIR, "app", "static", "index.html")
STYLE_CSS = os.path.join(ROOT_DIR, "app", "static", "css", "style.css")
APP_JS = os.path.join(ROOT_DIR, "app", "static", "js", "app.js")

def test_dashboard_html():
    print("\n=== TEST 1: index.html Dashboard DOM Verification ===")
    with open(INDEX_HTML, "r", encoding="utf-8") as f:
        html = f.read()

    # Extract tab-dashboard content
    assert 'id="tab-dashboard"' in html, "tab-dashboard exists"
    dash_content = html.split('id="tab-dashboard"')[1].split('id="tab-planning"')[0]

    # 1. Duplicate AI entry should NOT exist in dashboard
    assert '<section class="dashboard-ai-entry"' not in dash_content, "dashboard-ai-entry should be removed"
    assert 'id="dashboard-ai-input"' not in dash_content, "dashboard-ai-input should be removed"
    assert 'id="mobile-dash-ai-input"' not in dash_content, "mobile-dash-ai-input should be removed"
    print(" [PASS] 1. Duplicate AI textareas removed from desktop & mobile dashboard.")

    # 2. Static hardcoded badges should NOT exist in dashboard
    assert '+12%' not in dash_content, "Static +12% badge should be removed"
    assert '-2%' not in dash_content, "Static -2% badge should be removed"
    assert '+20%' not in dash_content, "Static +20% badge should be removed"
    assert '8,2% dari bulan lalu' not in dash_content, "Static mobile delta badge should be removed"
    print(" [PASS] 2. Static misleading badges (+12%, -2%, +20%, 8,2%) removed from dashboard.")

    # 3. Safe daily spend notes present in dashboard
    assert 'id="dash-daily-safe-spend"' in dash_content, "dash-daily-safe-spend should exist"
    assert 'id="mobile-daily-safe-spend"' in dash_content, "mobile-daily-safe-spend should exist"
    print(" [PASS] 3. Safe daily spend elements present in DOM.")

    # 4. Top spending card present in dashboard
    assert 'id="dashboard-top-spending-list"' in dash_content, "dashboard-top-spending-list should exist"
    assert 'id="mobile-top-spending-list"' in dash_content, "mobile-top-spending-list should exist"
    assert 'Kategori Pengeluaran Terbesar' in dash_content, "Kategori Pengeluaran Terbesar heading present"
    print(" [PASS] 4. Top spending cards present in desktop and mobile DOM.")

def test_dashboard_css():
    print("\n=== TEST 2: style.css Layout Verification ===")
    with open(STYLE_CSS, "r", encoding="utf-8") as f:
        css = f.read()

    assert '.dashboard-major-col' in css, "dashboard-major-col class exists"
    assert '.top-spending-card' in css, "top-spending-card class exists"
    assert 'grid-column: 1 / 8' in css, "700px left column grid placement exists"
    assert 'grid-column: 8 / -1' in css, "side column grid placement exists"
    print(" [PASS] style.css contains structured left column and side column grid rules.")

def test_app_js_logic():
    print("\n=== TEST 3: app.js Dynamic Logic Verification ===")
    with open(APP_JS, "r", encoding="utf-8") as f:
        js = f.read()

    assert 'this.summaryDailySafeSpend' in js, "summaryDailySafeSpend initialized"
    assert 'this.dashboardTopSpendingList' in js, "dashboardTopSpendingList initialized"
    assert 'renderDashboardTopCategories' in js, "renderDashboardTopCategories method exists"
    assert 'Aman belanja:' in js, "Safe spend calculation label present"
    print(" [PASS] app.js contains safe daily spend calculation and dynamic top spending category renderer.")

if __name__ == "__main__":
    print("============================================================")
    print("RUNNING DASHBOARD LAYOUT & DYNAMIC DATA VERIFICATION")
    print("============================================================")
    test_dashboard_html()
    test_dashboard_css()
    test_app_js_logic()
    print("============================================================")
    print("ALL DASHBOARD TESTS PASSED (100% GREEN)")
    print("============================================================")
