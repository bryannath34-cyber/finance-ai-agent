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
    """Menghasilkan HTML dan Plain Text untuk email reset password dengan standar Stripe/Linear minimalist."""
    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1A1A; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8F9FA; width: 100%; margin: 0; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(0, 0, 0, 0.04);">
          
          <!-- Brand Bar -->
          <tr>
            <td style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #F3F4F6;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 32px; height: 32px; background: #111827; border-radius: 8px; text-align: center; vertical-align: middle;">
                          <span style="color: #10B981; font-size: 16px; font-weight: 700; line-height: 1;">&bull;</span>
                        </td>
                        <td style="padding-left: 12px; vertical-align: middle;">
                          <span style="font-size: 15px; font-weight: 600; color: #111827; letter-spacing: -0.3px;">Finance AI Agent</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 12px; color: #6B7280; font-weight: 500;">Keamanan</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 36px 28px 36px; text-align: left;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #111827; letter-spacing: -0.4px; line-height: 1.3;">
                Atur ulang kata sandi Anda
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Halo <strong>{name}</strong>, kami menerima permintaan untuk mengatur ulang kata sandi akun Finance AI Agent Anda. Silakan klik tombol di bawah untuk membuat kata sandi baru:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="left">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius: 8px; background-color: #111827;">
                          <a href="{reset_link}" target="_blank" style="font-size: 14px; font-weight: 500; color: #FFFFFF; text-decoration: none; padding: 12px 24px; display: inline-block; border-radius: 8px; letter-spacing: 0.1px;">
                            Atur Ulang Kata Sandi &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Notice -->
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #6B7280;">
                Tautan ini berlaku selama <strong>{expire_minutes} menit</strong> dan hanya dapat digunakan satu kali.
              </p>

              <!-- Fallback Link -->
              <div style="border-top: 1px solid #F3F4F6; padding-top: 20px; margin-top: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #9CA3AF;">
                  Jika tombol di atas tidak berfungsi, salin dan buka tautan berikut di peramban Anda:
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #2563EB; word-break: break-all;">
                  <a href="{reset_link}" target="_blank" style="color: #2563EB; text-decoration: underline;">{reset_link}</a>
                </p>
              </div>

              <!-- Security Advice -->
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #F3F4F6;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9CA3AF;">
                  Jika Anda tidak meminta perubahan kata sandi ini, abaikan email ini dengan aman. Akun Anda tetap terlindungi.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #FAFAFA; border-top: 1px solid #F3F4F6; text-align: left;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
                Finance AI Agent &bull; Asisten Keuangan Pribadi Mandiri
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

Kami menerima permintaan untuk mengatur ulang kata sandi akun Finance AI Agent Anda.

Kunjungi tautan berikut untuk membuat kata sandi baru (berlaku selama {expire_minutes} menit):
{reset_link}

Tautan ini hanya dapat digunakan satu kali. Jika Anda tidak meminta pengaturan ulang ini, abaikan email ini. Akun Anda tetap aman.

Salam,
Tim Finance AI Agent
"""
    return html_content, text_content


def _send_via_smtp(to_email: str, subject: str, html_content: str, text_content: str) -> Tuple[bool, str]:
    """Mengirim email via SMTP (mendukung Gmail, dsb) dengan auto-fallback port 587 dan 465."""
    smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(getattr(settings, "SMTP_PORT", 587))
    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_pass = getattr(settings, "SMTP_PASSWORD", None)

    if not smtp_user or not smtp_pass:
        return False, "SMTP_USER atau SMTP_PASSWORD belum dikonfigurasi di file .env."

    clean_pass = smtp_pass.replace(" ", "").strip()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Finance AI Agent <{smtp_user}>"
    msg["To"] = to_email

    part1 = MIMEText(text_content, "plain", "utf-8")
    part2 = MIMEText(html_content, "html", "utf-8")
    msg.attach(part1)
    msg.attach(part2)

    last_error = None
    ports_to_try = [smtp_port]
    fallback_port = 465 if smtp_port == 587 else 587
    if fallback_port not in ports_to_try:
        ports_to_try.append(fallback_port)

    for port in ports_to_try:
        try:
            if port == 465:
                with smtplib.SMTP_SSL(smtp_host, port, timeout=12) as server:
                    server.login(smtp_user, clean_pass)
                    server.sendmail(smtp_user, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, port, timeout=12) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, clean_pass)
                    server.sendmail(smtp_user, [to_email], msg.as_string())

            logger.info("Email reset password berhasil dikirim ke '%s' via SMTP (%s:%d)", to_email, smtp_host, port)
            return True, f"Email reset password berhasil dikirim via SMTP ({smtp_host}:{port})"
        except Exception as e:
            last_error = e
            logger.warning("Percobaan kirim SMTP via %s:%d gagal: %s. Mencoba fallback...", smtp_host, port, e)

    logger.error("Gagal mengirim email reset password via SMTP (%s): %s", smtp_host, last_error)
    return False, f"SMTP error: {str(last_error)}"


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
