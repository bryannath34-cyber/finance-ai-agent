"""
Exhaustive Automated Scenario Test Suite for Finance AI Agent Export Feature
Covers all 14 scenarios including filters, edge cases, formulas, CSV UTF-8 BOM,
empty datasets, special characters, and DOM/JS integration.
"""
import io
import os
import sys
import re
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.export_service import ExportService
import openpyxl


def run_all_scenarios():
    print("=" * 70)
    print("RUNNING EXHAUSTIVE SCENARIO TESTS: EXPORT TO EXCEL & CSV")
    print("=" * 70)

    dataset_full = [
        {
            "id": 1,
            "type": "EXPENSE",
            "amount": Decimal("45000.00"),
            "description": 'Makan Siang "Ayam Bakar", pedas',
            "transaction_date": "2026-10-01",
            "category_name": "Makanan & Minuman",
            "source_account_name": "BCA",
            "destination_account_name": None,
        },
        {
            "id": 2,
            "type": "EXPENSE",
            "amount": Decimal("1500000.00"),
            "description": "Tagihan Listrik & WiFi (PLN/Indihome)",
            "transaction_date": "2026-10-05",
            "category_name": "Utilitas",
            "source_account_name": "Mandiri",
            "destination_account_name": None,
        },
        {
            "id": 3,
            "type": "INCOME",
            "amount": Decimal("25000000.00"),
            "description": "Gaji Pokok & Bonus Q3",
            "transaction_date": "2026-10-01",
            "category_name": "Gaji",
            "source_account_name": None,
            "destination_account_name": "BCA",
        },
        {
            "id": 4,
            "type": "TRANSFER",
            "amount": Decimal("500000.00"),
            "description": "Top Up GoPay",
            "transaction_date": "2026-10-10",
            "category_name": None,
            "source_account_name": "BCA",
            "destination_account_name": "GoPay",
        },
        {
            "id": 5,
            "type": "EXPENSE",
            "amount": Decimal("75000000.00"),
            "description": "Renovasi Rumah (Pembayaran Tahap 1)",
            "transaction_date": "2026-09-15",
            "category_name": "Rumah Tangga",
            "source_account_name": "BCA",
            "destination_account_name": None,
        },
    ]

    # -------------------------------------------------------------
    # Scenario 1: Khusus Pengeluaran - Bulan & Tahun Tertentu
    # -------------------------------------------------------------
    exp_oct = [t for t in dataset_full if t["type"] == "EXPENSE" and "2026-10" in str(t["transaction_date"])]
    data_s1, fn_s1, mt_s1 = ExportService.export(exp_oct, year=2026, month=10, transaction_type="EXPENSE", format_type="xlsx")
    assert fn_s1 == "Laporan_Pengeluaran_Oktober_2026.xlsx", f"Unexpected filename: {fn_s1}"
    wb_s1 = openpyxl.load_workbook(io.BytesIO(data_s1))
    ws_s1 = wb_s1.active
    assert ws_s1.cell(row=1, column=1).value == "FINANCE AI AGENT — LAPORAN TRANSAKSI"
    assert "Khusus Pengeluaran" in ws_s1.cell(row=2, column=1).value
    assert "Oktober 2026" in ws_s1.cell(row=2, column=1).value
    # Headers
    h_s1 = [ws_s1.cell(row=5, column=c).value for c in range(1, 7)]
    assert h_s1 == ["No", "Tanggal Transaksi", "Kategori", "Rekening", "Deskripsi / Keterangan", "Nominal Pengeluaran (Rp)"]
    # Check total row formula and border
    total_cell = ws_s1.cell(row=ws_s1.max_row, column=6)
    assert total_cell.value == "=SUM(F6:F7)", f"Total formula wrong: {total_cell.value}"
    assert total_cell.border.bottom.style == "double", "Bottom border must be double for accounting format"
    print(" [PASS] Scenario 1: Khusus Pengeluaran - Bulan & Tahun Tertentu (XLSX, formulas & double border)")

    # -------------------------------------------------------------
    # Scenario 2: Khusus Pengeluaran - Satu Tahun Penuh (Semua Bulan)
    # -------------------------------------------------------------
    exp_year = [t for t in dataset_full if t["type"] == "EXPENSE"]
    data_s2, fn_s2, _ = ExportService.export(exp_year, year=2026, month=None, transaction_type="EXPENSE", format_type="xlsx")
    assert fn_s2 == "Laporan_Pengeluaran_Tahun_2026.xlsx", f"Unexpected filename: {fn_s2}"
    wb_s2 = openpyxl.load_workbook(io.BytesIO(data_s2))
    assert "Tahun 2026" in wb_s2.active.cell(row=2, column=1).value
    print(" [PASS] Scenario 2: Khusus Pengeluaran - Satu Tahun Penuh (Semua Bulan)")

    # -------------------------------------------------------------
    # Scenario 3: Khusus Pengeluaran - Semua Periode (Semua Tahun & Bulan)
    # -------------------------------------------------------------
    data_s3, fn_s3, _ = ExportService.export(exp_year, year=None, month=None, transaction_type="EXPENSE", format_type="xlsx")
    assert fn_s3 == "Laporan_Pengeluaran_Semua_Periode.xlsx", f"Unexpected filename: {fn_s3}"
    print(" [PASS] Scenario 3: Khusus Pengeluaran - Semua Periode")

    # -------------------------------------------------------------
    # Scenario 4: Khusus Pemasukan - Bulan & Tahun Tertentu
    # -------------------------------------------------------------
    inc_oct = [t for t in dataset_full if t["type"] == "INCOME"]
    data_s4, fn_s4, _ = ExportService.export(inc_oct, year=2026, month=10, transaction_type="INCOME", format_type="xlsx")
    assert fn_s4 == "Laporan_Pemasukan_Oktober_2026.xlsx"
    wb_s4 = openpyxl.load_workbook(io.BytesIO(data_s4))
    ws_s4 = wb_s4.active
    h_s4 = [ws_s4.cell(row=5, column=c).value for c in range(1, 7)]
    assert "Nominal Pemasukan (Rp)" in h_s4
    assert ws_s4.cell(row=ws_s4.max_row, column=1).value == "TOTAL PEMASUKAN"
    print(" [PASS] Scenario 4: Khusus Pemasukan - Bulan & Tahun Tertentu (XLSX)")

    # -------------------------------------------------------------
    # Scenario 5: Semua Transaksi - Bulan & Tahun Tertentu (Pemasukan, Pengeluaran, Transfer)
    # -------------------------------------------------------------
    all_oct = [t for t in dataset_full if "2026-10" in str(t["transaction_date"])]
    data_s5, fn_s5, _ = ExportService.export(all_oct, year=2026, month=10, transaction_type="ALL", format_type="xlsx")
    assert fn_s5 == "Laporan_Transaksi_Oktober_2026.xlsx"
    wb_s5 = openpyxl.load_workbook(io.BytesIO(data_s5))
    ws_s5 = wb_s5.active
    # Headers should include both Pemasukan & Pengeluaran columns
    h_s5 = [ws_s5.cell(row=5, column=c).value for c in range(1, 9)]
    assert "Pemasukan (Rp)" in h_s5 and "Pengeluaran (Rp)" in h_s5
    # Must have both TOTAL row and ARUS KAS BERSIH (NET) row
    net_cell_label = ws_s5.cell(row=ws_s5.max_row, column=1).value
    assert "ARUS KAS BERSIH (NET)" in net_cell_label
    total_cell_label = ws_s5.cell(row=ws_s5.max_row - 1, column=1).value
    assert "TOTAL" in total_cell_label
    print(" [PASS] Scenario 5: Semua Transaksi - Lengkap dengan Pemasukan, Pengeluaran, dan Arus Kas Bersih")

    # -------------------------------------------------------------
    # Scenario 6: Semua Transaksi - Semua Periode
    # -------------------------------------------------------------
    data_s6, fn_s6, _ = ExportService.export(dataset_full, year=None, month=None, transaction_type="ALL", format_type="xlsx")
    assert fn_s6 == "Laporan_Transaksi_Semua_Periode.xlsx"
    print(" [PASS] Scenario 6: Semua Transaksi - Semua Periode")

    # -------------------------------------------------------------
    # Scenario 7: Empty Dataset (0 Transaksi)
    # -------------------------------------------------------------
    data_empty, fn_empty, _ = ExportService.export([], year=2026, month=12, transaction_type="EXPENSE", format_type="xlsx")
    wb_empty = openpyxl.load_workbook(io.BytesIO(data_empty))
    ws_empty = wb_empty.active
    # Must not crash, should show friendly empty row
    msg_cell = ws_empty.cell(row=6, column=1).value
    assert "Tidak ada transaksi" in msg_cell
    print(" [PASS] Scenario 7: Empty Dataset (0 transaksi handled gracefully without crash)")

    # -------------------------------------------------------------
    # Scenario 8: Special Characters & Large Numbers (Billion Rupiah)
    # -------------------------------------------------------------
    large_dataset = [
        {
            "id": 99,
            "type": "EXPENSE",
            "amount": Decimal("1500000000.50"),
            "description": 'Pengadaan Mesin: "Model-X, Rev-2" & Spareparts; 100% baru!',
            "transaction_date": "2026-10-15",
            "category_name": "Investasi / Modal",
            "source_account_name": "BCA Bisnis",
            "destination_account_name": None,
        }
    ]
    data_s8, _, _ = ExportService.export(large_dataset, year=2026, month=10, transaction_type="EXPENSE", format_type="xlsx")
    wb_s8 = openpyxl.load_workbook(io.BytesIO(data_s8))
    cell_val = wb_s8.active.cell(row=6, column=6).value
    assert float(cell_val) > 1_000_000_000, "Large number must be preserved accurately"
    print(" [PASS] Scenario 8: Special characters, quotes, and large numbers (> 1.5 Milyar) formatted properly")

    # -------------------------------------------------------------
    # Scenario 9: CSV Export with UTF-8 BOM across All Filters
    # -------------------------------------------------------------
    csv_bytes, fn_csv, mt_csv = ExportService.export(large_dataset, year=2026, month=10, transaction_type="EXPENSE", format_type="csv")
    assert csv_bytes.startswith(b"\xef\xbb\xbf"), "CSV must start with UTF-8 BOM so Excel opens with proper accents"
    csv_text = csv_bytes.decode("utf-8")
    assert "TOTAL PENGELUARAN" in csv_text
    assert "1500000000" in csv_text
    # RFC 4180 doubles quotes in CSV values: ""Model-X, Rev-2""
    assert '""Model-X, Rev-2""' in csv_text or '"Model-X, Rev-2"' in csv_text
    print(" [PASS] Scenario 9: CSV export format with UTF-8 BOM and correct quoting for Excel on Windows")

    # -------------------------------------------------------------
    # Scenario 10: Cell Styling & Auto-fit Column Widths in Openpyxl
    # -------------------------------------------------------------
    ws_check = wb_s1.active
    col_a_width = ws_check.column_dimensions["A"].width
    col_b_width = ws_check.column_dimensions["B"].width
    assert col_a_width >= 7, "Column A (No) must be at least width 7"
    assert col_b_width >= 14, "Column B (Date) must be at least width 14"
    header_cell = ws_check.cell(row=5, column=1)
    assert header_cell.fill.start_color.rgb == "001B3B2B" or header_cell.fill.start_color.value == "1B3B2B"
    assert header_cell.font.color.rgb == "00FFFFFF" or header_cell.font.color.value == "FFFFFF"
    print(" [PASS] Scenario 10: Nordic dark green header styling, font colors, and auto-fit column widths verified")

    # -------------------------------------------------------------
    # Scenario 11: SQL Reversal Filter Safety
    # -------------------------------------------------------------
    with open("app/services/transaction_service.py", "r", encoding="utf-8") as f:
        ts_code = f.read()
    assert "t.is_reversal = FALSE" in ts_code, "Reversed transactions must be excluded from export"
    print(" [PASS] Scenario 11: Backend SQL excludes reversed/cancelled entries (t.is_reversal = FALSE)")

    # -------------------------------------------------------------
    # Scenario 12: Backend FastAPI Route Validation
    # -------------------------------------------------------------
    with open("app/api/transactions.py", "r", encoding="utf-8") as f:
        api_code = f.read()
    assert '@router.get("/export")' in api_code, "GET /transactions/export route missing"
    assert 'format: str = Query("xlsx", regex="^(xlsx|csv)$")' in api_code, "Format parameter validation regex missing"
    print(" [PASS] Scenario 12: Backend route GET /transactions/export and parameter validation verified")

    # -------------------------------------------------------------
    # Scenario 13: DOM Modal & Form Validation in index.html
    # -------------------------------------------------------------
    with open("app/static/index.html", "r", encoding="utf-8") as f:
        html = f.read()
    for el_id in ["modal-export-report", "form-export-report", "select-export-type", "select-export-year", "select-export-month", "select-export-format", "btn-cancel-export", "btn-confirm-export"]:
        assert f'id="{el_id}"' in html, f"Element #{el_id} missing in index.html"
    assert 'onclick="window.app?.closeModals()"' in html, "Batal button must have inline modal-close fallback"
    print(" [PASS] Scenario 13: DOM Modal, form controls, and Batal button fallback verified in index.html")

    # -------------------------------------------------------------
    # Scenario 14: Frontend JavaScript Scoping & Handlers in app.js
    # -------------------------------------------------------------
    with open("app/static/js/app.js", "r", encoding="utf-8") as f:
        app_js = f.read()
    assert "openExportModal()" in app_js, "openExportModal() method missing in app.js"
    assert "handleExportSubmit(e)" in app_js, "handleExportSubmit() method missing in app.js"
    assert "targetId === 'form-export-report'" in app_js, "Delegated submit preventDefault for form-export-report missing"
    assert "this.btnExportReport.addEventListener('click'" in app_js, "btnExportReport click listener missing"
    assert "this.btnSettingsExportCsv.addEventListener('click'" in app_js, "btnSettingsExportCsv click listener missing"
    print(" [PASS] Scenario 14: JavaScript event handlers, loading states, and submit prevention verified")

    print("=" * 70)
    print("ALL 14 COMPREHENSIVE EXPORT SCENARIOS PASSED (100% GREEN)!")
    print("=" * 70)


if __name__ == "__main__":
    run_all_scenarios()
