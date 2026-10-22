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
    Desain 1:1 Figma Design System v2.3 (Nordic / Apple Fintech Minimalist):
    - Background Canvas: #F2F3F1
    - Card: #FFFFFF border #E2E5DF radius 16px
    - Brand Tile: #252A26 dengan SVG Wallet resmi
    - Button: #252A26 teks #FFFFFF radius 12px
    - Warna teks: #202420, #6F7770, #959C95
    - ZERO EMOJI (100% profesional dan elegan)
    """
    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F2F3F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #202420; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F2F3F1; width: 100%; margin: 0; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card (Figma 1:1) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 500px; background-color: #FFFFFF; border: 1px solid #E2E5DF; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(32, 36, 32, 0.04);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 24px 28px 18px 28px; background-color: #FAFAF8; border-bottom: 1px solid #E2E5DF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <!-- Brand Icon Tile (#252A26 with clean vector wallet) -->
                        <td style="width: 28px; height: 28px; background-color: #252A26; border-radius: 8px; text-align: center; vertical-align: middle; line-height: 0;">
                          <img src="https://img.icons8.com/ios-filled/50/ffffff/wallet.png" width="14" height="14" alt="Logo" style="display: inline-block; vertical-align: middle; border: 0;" />
                        </td>
                        <td style="padding-left: 10px; vertical-align: middle;">
                          <span style="font-size: 14px; font-weight: 600; color: #202420; letter-spacing: -0.2px;">Finance AI Agent</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 11px; font-weight: 500; color: #6F7770; background-color: #FFFFFF; border: 1px solid #E2E5DF; padding: 3px 9px; border-radius: 12px;">
                      v2.3
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 28px 24px 28px; text-align: left;">
              <h1 style="margin: 0 0 10px 0; font-size: 19px; font-weight: 600; color: #202420; letter-spacing: -0.3px; line-height: 1.35;">
                Atur ulang kata sandi
              </h1>
              <p style="margin: 0 0 22px 0; font-size: 13.5px; line-height: 1.6; color: #6F7770;">
                Halo <strong>{name}</strong>, kami menerima permintaan pengaturan ulang kata sandi untuk akun Anda. Silakan klik tombol di bawah untuk membuat kata sandi baru:
              </p>

              <!-- CTA Button (#252A26 matching web primary button) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="left">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius: 11px; background-color: #252A26;">
                          <a href="{reset_link}" target="_blank" style="font-size: 13.5px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 12px 26px; display: inline-block; border-radius: 11px; letter-spacing: 0.1px;">
                            Atur Ulang Kata Sandi
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Expiration Callout Box (#F8F9F7 with #E2E5DF border) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8F9F7; border: 1px solid #E2E5DF; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <div style="font-size: 12px; font-weight: 600; color: #202420; margin-bottom: 2px;">
                      Masa berlaku tautan: {expire_minutes} menit
                    </div>
                    <div style="font-size: 11.5px; color: #6F7770; line-height: 1.5;">
                      Tautan ini hanya dapat digunakan satu kali. Jika kedaluwarsa, silakan ajukan permintaan baru dari halaman login.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <div style="border-top: 1px solid #E2E5DF; padding-top: 18px; margin-top: 8px;">
                <p style="margin: 0 0 6px 0; font-size: 11.5px; color: #959C95;">
                  Jika tombol di atas tidak dapat diklik, buka tautan berikut di peramban Anda:
                </p>
                <div style="background-color: #F8F9F7; border: 1px solid #E2E5DF; border-radius: 6px; padding: 8px 10px; font-family: -apple-system-ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10.5px; color: #486F95; word-break: break-all; line-height: 1.45;">
                  {reset_link}
                </div>
              </div>

              <!-- Security Disclaimer -->
              <div style="margin-top: 18px; padding-top: 14px;">
                <p style="margin: 0; font-size: 11.5px; line-height: 1.5; color: #6F7770;">
                  Jika Anda tidak merasa mengajukan permintaan ini, abaikan pesan ini. Kata sandi akun Anda tidak akan berubah tanpa konfirmasi Anda.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 16px 28px; background-color: #FAFAF8; border-top: 1px solid #E2E5DF; text-align: left;">
              <p style="margin: 0; font-size: 11px; color: #959C95; line-height: 1.5;">
                Finance AI Agent &bull; Sistem Keuangan Pribadi Mandiri
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

Kami menerima permintaan pengaturan ulang kata sandi untuk akun Finance AI Agent Anda.

Kunjungi tautan berikut untuk membuat kata sandi baru (berlaku selama {expire_minutes} menit):
{reset_link}

Tautan ini hanya dapat digunakan satu kali. Jika Anda tidak merasa mengajukan permintaan ini, abaikan pesan ini. Akun Anda tetap aman.

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
