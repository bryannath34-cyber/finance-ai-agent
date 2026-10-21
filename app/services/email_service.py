"""
Modul Layanan Email untuk Finance AI Agent.
Mendukung:
1. Google SMTP / Custom SMTP (tanpa perlu domain pribadi, gratis 100%, langsung kirim ke semua email)
2. Resend API (HTTPS REST)
"""
import json
import logging
import smtplib
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple
from app.core.config import settings

logger = logging.getLogger("personal_finance.email")


def _build_email_templates(name: str, reset_link: str, expire_minutes: int, subject: str) -> Tuple[str, str]:
    """Menghasilkan HTML dan Plain Text untuk email reset password."""
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
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #0ea5e9, #10b981);">
                    <a href="{reset_link}" target="_blank" style="font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 10px; letter-spacing: 0.3px;">
                      Atur Ulang Kata Sandi Sekarang &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                Atau salin dan tempel tautan berikut di peramban (browser) Anda jika tombol di atas tidak dapat diklik:
              </p>
              <div style="background-color: #0b1319; border: 1px solid #1a2a38; border-radius: 8px; padding: 12px; word-break: break-all; font-family: monospace; font-size: 12px; color: #38bdf8; line-height: 1.4; margin-bottom: 24px;">
                {reset_link}
              </div>

              <div style="border-top: 1px solid #1a2a38; padding-top: 20px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                  ⚠️ Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini dengan aman. Kata sandi Anda tidak akan berubah.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0a1117; border-top: 1px solid #14202c; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #475569;">
                Finance AI Agent &bull; Asisten Keuangan Pribadi Berbasis Kecerdasan Buatan
              </p>
              <p style="margin: 0; font-size: 11px; color: #334155;">
                Email ini dibuat secara otomatis. Mohon tidak membalas email ini.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"""Atur Ulang Kata Sandi - Finance AI Agent

Halo {name},

Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.

Kunjungi tautan berikut untuk membuat kata sandi baru (berlaku selama {expire_minutes} menit):
{reset_link}

Jika Anda tidak meminta pengaturan ulang ini, abaikan email ini. Akun Anda tetap aman.

Salam,
Tim Finance AI Agent
"""
    return html_content, text_content


def _send_via_smtp(to_email: str, subject: str, html_content: str, text_content: str) -> Tuple[bool, str]:
    """Mengirim email via SMTP (mendukung Gmail, dsb)."""
    smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(getattr(settings, "SMTP_PORT", 587))
    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_pass = getattr(settings, "SMTP_PASSWORD", None)
    use_tls = getattr(settings, "SMTP_USE_TLS", True)

    if not smtp_user or not smtp_pass:
        return False, "SMTP_USER atau SMTP_PASSWORD belum dikonfigurasi di file .env."

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Finance AI Agent <{smtp_user}>"
        msg["To"] = to_email

        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                if use_tls:
                    server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to_email], msg.as_string())

        logger.info("Email reset password berhasil dikirim ke '%s' via SMTP (%s)", to_email, smtp_host)
        return True, "Email reset password berhasil dikirim via SMTP"
    except Exception as e:
        logger.error("Gagal mengirim email reset password via SMTP (%s): %s", smtp_host, e)
        return False, f"SMTP error: {str(e)}"


def _send_via_resend(to_email: str, subject: str, html_content: str, text_content: str) -> Tuple[bool, str]:
    """Mengirim email via Resend API."""
    api_key = settings.RESEND_API_KEY
    if not api_key:
        return False, "RESEND_API_KEY belum dikonfigurasi di server."

    from_email = settings.RESEND_FROM_EMAIL or "Finance AI Agent <onboarding@resend.dev>"
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


def send_password_reset_email(to_email: str, recipient_name: str, reset_link: str, expire_minutes: int = 15) -> Tuple[bool, str]:
    """
    Mengirimkan email tautan pemulihan kata sandi.
    Secara otomatis menggunakan:
    1. Google SMTP / Custom SMTP jika SMTP_USER & SMTP_PASSWORD terisi di .env (Bebas kirim ke semua email, 0 domain)
    2. Resend API jika RESEND_API_KEY terisi
    """
    name = recipient_name.strip() if recipient_name else "Pengguna"
    subject = "Atur Ulang Kata Sandi - Finance AI Agent"
    html_content, text_content = _build_email_templates(name, reset_link, expire_minutes, subject)

    # 1. Gunakan SMTP jika user/password dikonfigurasi (misal Google App Password)
    if getattr(settings, "SMTP_USER", None) and getattr(settings, "SMTP_PASSWORD", None):
        return _send_via_smtp(to_email, subject, html_content, text_content)

    # 2. Gunakan Resend API jika API Key tersedia
    if getattr(settings, "RESEND_API_KEY", None):
        return _send_via_resend(to_email, subject, html_content, text_content)

    return False, "Layanan email belum dikonfigurasi di server (SMTP_USER/SMTP_PASSWORD atau RESEND_API_KEY belum diisi)."
