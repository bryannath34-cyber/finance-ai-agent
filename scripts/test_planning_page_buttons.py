"""
Automated Verification Suite for Anggaran & Tabungan Page Buttons
Validates that every single button and modal flow on tab-planning exists,
is mapped in app.js, and has active listeners without broken scoping.
"""
import re
import sys

def run_tests():
    print("=" * 60)
    print("TESTING ANGGARAN & TABUNGAN (tab-planning) BUTTONS & FLOWS")
    print("=" * 60)

    with open("app/static/index.html", "r", encoding="utf-8") as f:
        html = f.read()

    with open("app/static/js/app.js", "r", encoding="utf-8") as f:
        js = f.read()

    # 1. Check tab-planning exists in index.html
    assert 'id="tab-planning"' in html, "tab-planning section missing in index.html"
    print(" [PASS] 1. tab-planning section exists in index.html")

    # 2. Check all 8 static button IDs on the planning page exist in index.html
    planning_button_ids = [
        "btn-planning-period-picker",
        "btn-edit-budget-pagu",
        "btn-add-category-budget",
        "btn-view-all-budget-history",
        "btn-set-budget-month-pill",
        "btn-add-savings-goal",
        "btn-plan-contribution",
        "mobile-btn-goto-reports",
    ]
    for btn_id in planning_button_ids:
        assert f'id="{btn_id}"' in html, f"Button #{btn_id} missing in index.html"
        print(f" [PASS] 2. Button #{btn_id} verified in HTML")

    # 3. Check all target modals for planning actions exist in index.html
    planning_modals = [
        "modal-month-picker",
        "modal-set-budget",
        "modal-set-cat-budget",
        "modal-create-goal",
        "modal-create-tx",
    ]
    for modal_id in planning_modals:
        assert f'id="{modal_id}"' in html, f"Modal #{modal_id} missing in index.html"
        print(f" [PASS] 3. Modal #{modal_id} verified in HTML")

    # 4. Check all corresponding element references are initialized in app.js initElements()
    element_props = [
        "btnPlanningPeriodPicker",
        "btnEditBudgetPagu",
        "btnAddCategoryBudget",
        "btnSetBudgetMonthPill",
        "btnAddSavingsGoal",
        "btnPlanContribution",
        "mobileBtnGotoReports",
        "modalMonthPicker",
        "modalSetBudget",
        "modalSetCatBudget",
        "modalCreateGoal",
    ]
    for prop in element_props:
        pattern = rf"this\.{prop}\s*=\s*document\.getElementById\("
        assert re.search(pattern, js), f"Property this.{prop} not initialized in app.js"
        print(f" [PASS] 4. Element this.{prop} properly initialized in app.js")

    # 5. Check bindOpenModal is declared BEFORE any call (no TDZ / ReferenceError)
    bind_decl_pos = js.find("const bindOpenModal = (btn, modal, onOpen = null) =>")
    assert bind_decl_pos != -1, "bindOpenModal top-level declaration missing in attachEventListeners"
    first_call_pos = js.find("bindOpenModal(")
    assert bind_decl_pos <= first_call_pos, "bindOpenModal was called before its const declaration (TDZ ReferenceError bug)!"
    print(" [PASS] 5. bindOpenModal declaration order verified (declared BEFORE any call, zero TDZ)")

    # 6. Check explicit event listeners for every single planning button
    assert "this.btnPlanningPeriodPicker.addEventListener('click'" in js, "btnPlanningPeriodPicker click listener missing"
    assert "this.btnEditBudgetPagu.addEventListener('click'" in js, "btnEditBudgetPagu click listener missing"
    assert "this.btnSetBudgetMonthPill.addEventListener('click'" in js, "btnSetBudgetMonthPill click listener missing"
    assert "this.btnAddCategoryBudget.addEventListener('click'" in js, "btnAddCategoryBudget click listener missing"
    assert "this.btnAddSavingsGoal.addEventListener('click'" in js, "btnAddSavingsGoal click listener missing"
    assert "this.btnPlanContribution.addEventListener('click'" in js, "btnPlanContribution click listener missing"
    assert "btnViewAllBudgetHistory.addEventListener('click'" in js, "btnViewAllBudgetHistory click listener missing"
    assert "this.mobileBtnGotoReports.addEventListener('click'" in js, "mobileBtnGotoReports click listener missing"
    print(" [PASS] 6. All 8 primary buttons have active click event listeners in app.js")

    # 7. Check dynamic table and card action buttons
    # a) Category Budget quick set button
    assert ".btn-quick-cat-limit" in js, ".btn-quick-cat-limit handler missing"
    # b) Goal contribute button
    assert ".btn-goal-contribute" in js, ".btn-goal-contribute handler missing"
    # c) Goal complete button
    assert ".btn-goal-complete" in js, ".btn-goal-complete handler missing"
    print(" [PASS] 7. Dynamic buttons (.btn-quick-cat-limit, .btn-goal-contribute, .btn-goal-complete) verified")

    # 8. Check planning form submissions and reload prevention
    assert "this.formSetBudget.addEventListener('submit'" in js, "formSetBudget submit listener missing"
    assert "this.formSetCatBudget.addEventListener('submit'" in js, "formSetCatBudget submit listener missing"
    assert "this.formCreateGoal.addEventListener('submit'" in js, "formCreateGoal submit listener missing"
    assert "targetId === 'form-set-budget'" in js, "Delegated submit preventDefault for form-set-budget missing"
    print(" [PASS] 8. Planning form submission handlers and delegated reload-prevention verified")

    # 9. Verify loadPlanningData ensures accounts and categories are fetched
    assert "this.loadCategories()" in js and "this.loadAccounts()" in js, (
        "loadPlanningData must ensure categories and accounts are ready for modal selects"
    )
    print(" [PASS] 9. Automatic cache-warm for categories & accounts verified")

    # 10. Verify modal cancel buttons (Batal) and close fallback
    assert 'id="btn-cancel-set-budget"' in html and 'onclick="window.app?.closeModals()"' in html, (
        "modal-set-budget Batal button must have id and onclick fallback"
    )
    assert 'id="btn-cancel-set-cat-budget"' in html, "modal-set-cat-budget Batal button missing ID"
    assert 'id="btn-cancel-create-goal"' in html, "modal-create-goal Batal button missing ID"
    assert "e.target.closest('.btn-close-modal')" in js, "Delegated modal-close handler missing in app.js"
    print(" [PASS] 10. Modal Batal buttons have both delegated listener and inline fallback")

    # 11. Check version bump to avoid stale browser cache
    assert 'src="js/app.js?v=2.8.8"' in html, "Cache version must be bumped to v=2.8.8"
    print(" [PASS] 11. Script version v=2.8.8 verified for immediate cache invalidation")

    print("=" * 60)
    print("ALL ANGGARAN & TABUNGAN BUTTON TESTS PASSED (100% GREEN)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

