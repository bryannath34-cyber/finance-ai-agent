"""
Modul Layanan Email untuk Finance AI Agent.
Menggunakan Resend API (HTTPS REST) dengan template HTML elegan dan fallback aman.
"""
import json
import logging
import urllib.request
import urllib.error
from typing import Tuple
from app.core.config import settings

logger = logging.getLogger("personal_finance.email")


def send_password_reset_email(to_email: str, recipient_name: str, reset_link: str, expire_minutes: int = 15) -> Tuple[bool, str]:
    """
    Mengirimkan email tautan pemulihan kata sandi melalui Resend API.
    Mengembalikan (success: bool, message: str).
    """
    api_key = settings.RESEND_API_KEY
    if not api_key:
        logger.error("Gagal mengirim email: RESEND_API_KEY belum dikonfigurasi di settings.")
        return False, "Layanan email belum dikonfigurasi di server."

    from_email = settings.RESEND_FROM_EMAIL or "Finance AI Agent <onboarding@resend.dev>"
    name = recipient_name.strip() if recipient_name else "Pengguna"

    subject = "Atur Ulang Kata Sandi - Finance AI Agent"

    # Template HTML Modern bertema Nordic & Glassmorphism
    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1319; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1319; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #121e28; border: 1px solid #1e3242; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #1a2a38; text-align: left;">
              <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #10b981); width: 36px; height: 36px; border-radius: 10px; vertical-align: middle; margin-right: 12px;"></div>
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; vertical-align: middle;">Finance AI Agent</span>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px; text-align: left;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #f8fafc;">Atur Ulang Kata Sandi</h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Halo <strong style="color: #f1f5f9;">{name}</strong>, kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Klik tombol di bawah ini untuk membuat kata sandi baru. Tautan ini hanya berlaku selama <strong style="color: #10b981;">{expire_minutes} menit</strong>:
              </p>

              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #0ea5e9, #059669);">
                    <a href="{reset_link}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">
                      Atur Ulang Kata Sandi Sekarang &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback -->
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Jika tombol di atas tidak dapat diklik, salin dan tempelkan tautan berikut ke bilah alamat browser Anda:
              </p>
              <p style="margin: 0 0 28px 0; font-size: 12px; color: #38bdf8; word-break: break-all; line-height: 1.4; background-color: #0b1319; padding: 12px; border-radius: 8px; border: 1px solid #1e3242;">
                <a href="{reset_link}" style="color: #38bdf8; text-decoration: none;">{reset_link}</a>
              </p>

              <!-- Security notice -->
              <div style="border-top: 1px solid #1a2a38; padding-top: 20px;">
                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                  <strong>Perhatian:</strong> Jika Anda tidak merasa meminta pengaturan ulang kata sandi ini, abaikan email ini. Akun Anda tetap aman dan kata sandi Anda tidak akan berubah.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0c151c; border-top: 1px solid #1a2a38; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #475569;">
                &copy; Finance AI Agent &bull; Notifikasi Keamanan Otomatis
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    text_content = f"""Halo {name},

Kami menerima permintaan untuk mengatur ulang kata sandi akun Finance AI Agent Anda.

Kunjungi tautan berikut untuk membuat kata sandi baru (berlaku selama {expire_minutes} menit):
{reset_link}

Jika Anda tidak meminta pengaturan ulang ini, abaikan email ini. Akun Anda tetap aman.

Salam,
Tim Finance AI Agent
"""

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }

    try:
        body_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=body_bytes,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "FinanceAIAgent/1.0",
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=12) as res:
            res_body = res.read().decode("utf-8")
            res_data = json.loads(res_body)
            email_id = res_data.get("id", "ok")
            logger.info("Email reset password berhasil dikirim ke '%s' via Resend (ID: %s)", to_email, email_id)
            return True, f"Email reset password berhasil dikirim (ID: {email_id})"

    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        logger.error("HTTP error saat kirim email Resend (%s): %s", e.code, err_msg)
        try:
            err_json = json.loads(err_msg)
            msg = err_json.get("message", err_msg)
            return False, f"Resend API error: {msg}"
        except Exception:
            return False, f"Resend API error HTTP {e.code}"
    except Exception as e:
        logger.error("Gagal mengirim email reset password via Resend: %s", e)
        return False, f"Kesalahan koneksi email: {str(e)}"
