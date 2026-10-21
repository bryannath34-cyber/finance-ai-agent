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
    """Menghasilkan HTML dan Plain Text untuk email reset password dengan estetika Nordic / Figma 1:1."""
    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F2F3F1; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #202420; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F2F3F1; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Figma 1:1) -->
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E2E5DF; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(32, 36, 32, 0.04);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 22px 28px; background-color: #FAFAF8; border-bottom: 1px solid #E2E5DF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 30px; height: 30px; background-color: #252A26; border-radius: 8px; text-align: center; vertical-align: middle;">
                          <span style="color: #FFFFFF; font-size: 15px; font-weight: 700; line-height: 1;">✦</span>
                        </td>
                        <td style="padding-left: 10px; vertical-align: middle;">
                          <span style="font-size: 15px; font-weight: 600; color: #202420; letter-spacing: -0.2px;">Finance AI Agent</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 4px 10px; background-color: #FFFFFF; border: 1px solid #E2E5DF; border-radius: 14px; font-size: 11px; font-weight: 500; color: #6F7770; letter-spacing: 0.1px;">
                      Keamanan Akun
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; text-align: left;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #202420; letter-spacing: -0.3px; line-height: 1.3;">
                Atur ulang kata sandi
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #6F7770;">
                Halo <strong style="color: #202420; font-weight: 600;">{name}</strong>, kami menerima permintaan untuk mengatur ulang kata sandi akun Finance AI Agent Anda.
              </p>

              <!-- Privacy / Info Callout Card (Matching Web Component) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8F9F7; border: 1px solid #E2E5DF; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 28px; vertical-align: top; padding-top: 1px;">
                          <span style="display: inline-block; width: 22px; height: 22px; background-color: #EAF4EE; border: 1px solid #D5E8DC; border-radius: 6px; text-align: center; line-height: 20px; font-size: 12px; color: #2D7653;">🔒</span>
                        </td>
                        <td style="padding-left: 8px; vertical-align: middle;">
                          <div style="font-size: 13px; font-weight: 600; color: #202420; margin-bottom: 2px;">
                            Tautan Berlaku {expire_minutes} Menit
                          </div>
                          <div style="font-size: 12px; color: #6F7770; line-height: 1.45;">
                            Demi keamanan, tautan ini hanya bisa dipakai satu kali dan kedaluwarsa secara otomatis.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Main Action CTA Button (Matching .btn-login-submit) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="border-radius: 12px; background-color: #252A26; box-shadow: 0 2px 8px rgba(37, 42, 38, 0.18);">
                          <a href="{reset_link}" target="_blank" style="font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 13px 28px; display: inline-block; border-radius: 12px; letter-spacing: 0.2px;">
                            Atur Ulang Kata Sandi Sekarang &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link Section -->
              <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #959C95;">
                Atau salin tautan berikut ke peramban (browser) Anda jika tombol di atas tidak berfungsi:
              </p>
              <div style="background-color: #F8F9F7; border: 1px solid #E2E5DF; border-radius: 8px; padding: 10px 14px; word-break: break-all; font-family: -apple-system-ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #486F95; line-height: 1.45; margin-bottom: 24px;">
                {reset_link}
              </div>

              <!-- Security Advice Notice -->
              <div style="border-top: 1px solid #E2E5DF; padding-top: 18px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #6F7770;">
                  🛡️ Jika Anda tidak meminta pengaturan ulang ini, abaikan email ini dengan aman. Kata sandi akun Anda tidak akan berubah tanpa konfirmasi Anda.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 20px 32px; background-color: #FAFAF8; border-top: 1px solid #E2E5DF; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 500; color: #6F7770;">
                Finance AI Agent &bull; Sistem Keuangan Pribadi Mandiri
              </p>
              <p style="margin: 0; font-size: 11px; color: #959C95;">
                Email ini dibuat secara otomatis oleh sistem keamanan akun. Mohon tidak membalas email ini.
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

Demi keamanan akun, tautan ini hanya bisa dipakai satu kali. Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini. Akun Anda tetap aman.

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
