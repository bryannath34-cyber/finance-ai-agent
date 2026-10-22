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
    """
    Menghasilkan HTML dan Plain Text untuk email reset password.
    Desain minimalis persis referensi pengguna dengan style website Finance AI Agent:
    - Canvas: #F6F7F5
    - Card: #FFFFFF border #E5E7EB radius 12px
    - Header: Icon gelombang AI di tengah + Brand uppercase + Judul tebal
    - Garis pemisah tipis
    - Teks sapaan & pesan ringkas langsung ke inti
    - Tombol full-width #252A26 radius 10px
    - Footer di luar kartu: Kontak bantuan, mini icon, copyright
    """
    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F7F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #202420; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F6F7F5; width: 100%; margin: 0; padding: 48px 16px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
          
          <!-- Card Header (Centered Logo + Brand + Title) -->
          <tr>
            <td align="center" style="padding: 36px 32px 28px 32px; border-bottom: 1px solid #F0F2EE;">
              
              <!-- Centered Soundwave AI Icon -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 12px auto;">
                <tr>
                  <td align="center" style="line-height: 0;">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#252A26" stroke-width="2.2" stroke-linecap="round">
                      <line x1="4" y1="11" x2="4" y2="13" />
                      <line x1="8" y1="7" x2="8" y2="17" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                      <line x1="16" y1="7" x2="16" y2="17" />
                      <line x1="20" y1="11" x2="20" y2="13" />
                    </svg>
                  </td>
                </tr>
              </table>

              <!-- Brand Name (All Caps Tracking) -->
              <div style="font-size: 13px; font-weight: 700; letter-spacing: 2px; color: #202420; text-transform: uppercase; margin-bottom: 10px;">
                FINANCE AI AGENT
              </div>

              <!-- Main Heading -->
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #202420; letter-spacing: -0.3px; line-height: 1.3;">
                Atur ulang kata sandi
              </h1>
            </td>
          </tr>

          <!-- Card Body -->
          <tr>
            <td style="padding: 32px 36px 36px 36px; text-align: left;">
              
              <!-- Greeting -->
              <div style="font-size: 14px; font-weight: 700; color: #202420; margin-bottom: 14px;">
                Halo {name},
              </div>

              <!-- Concise Message -->
              <p style="margin: 0 0 28px 0; font-size: 13.5px; line-height: 1.65; color: #4B524B;">
                Perlu mengatur ulang kata sandi Anda? Cukup klik tombol di bawah ini untuk membuat kata sandi baru akun Anda. Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini dengan aman.
              </p>

              <!-- Full-Width Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #252A26;">
                    <a href="{reset_link}" target="_blank" style="display: block; width: 100%; padding: 14px 24px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; text-align: center; border-radius: 10px; box-sizing: border-box; letter-spacing: 0.1px;">
                      Atur ulang kata sandi
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Subtle Fallback Link -->
              <div style="font-size: 11px; color: #959C95; line-height: 1.45; word-break: break-all;">
                Jika tombol di atas tidak dapat diklik, salin tautan berikut:<br>
                <a href="{reset_link}" target="_blank" style="color: #486F95; text-decoration: underline;">{reset_link}</a>
              </div>

            </td>
          </tr>

        </table>
        <!-- End Main Card -->

        <!-- Outside Footer (Directly Matching Reference) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; margin-top: 28px;">
          <tr>
            <td align="center" style="text-align: center;">
              
              <!-- Support Contacts -->
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #8A928A; line-height: 1.5;">
                Ada pertanyaan atau kendala? Hubungi tim bantuan kami<br>
                atau email <a href="mailto:support@financeai.id" style="color: #6F7770; text-decoration: underline;">support@financeai.id</a>
              </p>

              <!-- Mini Wave Icon -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 10px auto;">
                <tr>
                  <td align="center" style="line-height: 0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA29A" stroke-width="2" stroke-linecap="round">
                      <line x1="4" y1="11" x2="4" y2="13" />
                      <line x1="8" y1="7" x2="8" y2="17" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                      <line x1="16" y1="7" x2="16" y2="17" />
                      <line x1="20" y1="11" x2="20" y2="13" />
                    </svg>
                  </td>
                </tr>
              </table>

              <!-- Copyright -->
              <div style="font-size: 11px; color: #9AA29A; text-transform: uppercase; letter-spacing: 1px; line-height: 1.5;">
                2026 FINANCE AI AGENT<br>
                <span style="text-transform: lowercase; font-size: 10.5px; letter-spacing: 0;">all right reserved</span>
              </div>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"""Atur ulang kata sandi - FINANCE AI AGENT

Halo {name},

Perlu mengatur ulang kata sandi Anda? Cukup buka tautan di bawah ini untuk membuat kata sandi baru:
{reset_link}

Tautan ini berlaku selama {expire_minutes} menit. Jika Anda tidak meminta perubahan ini, abaikan email ini dengan aman.

2026 FINANCE AI AGENT
all right reserved
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
