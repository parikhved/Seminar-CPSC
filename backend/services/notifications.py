import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage


@dataclass
class NotificationResult:
    status: str
    detail: str


def send_violation_notification(
    recipient_email: str,
    recipient_name: str,
    recall_name: str,
    listing_title: str,
    listing_url: str,
    violation_status: str,
    message: str,
    investigator_notes: str,
) -> NotificationResult:
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_from = os.getenv("SMTP_FROM", "").strip()

    if not smtp_host or not smtp_from:
        return NotificationResult(
            status="skipped",
            detail="Violation logged, but SMTP is not configured. Set SMTP_HOST and SMTP_FROM to send emails.",
        )

    email = EmailMessage()
    email["Subject"] = f"CPSC violation notice: {recall_name}"
    email["From"] = smtp_from
    email["To"] = recipient_email
    email.set_content(
        (
            f"Hello {recipient_name or 'Seller'},\n\n"
            f"A CPSC investigator logged a marketplace violation connected to the recalled product "
            f"\"{recall_name}\".\n\n"
            f"Listing: {listing_title}\n"
            f"Listing URL: {listing_url}\n"
            f"Current status: {violation_status}\n\n"
            f"Violation summary:\n{message}\n\n"
            f"Investigator notes:\n{investigator_notes}\n\n"
            "Please review the listing immediately and take corrective action.\n"
        )
    )

    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() != "false"

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
            smtp.ehlo()
            if use_tls:
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
            if smtp_username and smtp_password:
                smtp.login(smtp_username, smtp_password)
            smtp.send_message(email)
    except Exception as exc:
        return NotificationResult(
            status="failed",
            detail=f"Violation logged, but email delivery failed: {exc}",
        )

    return NotificationResult(
        status="sent",
        detail=f"Seller notification sent to {recipient_email}.",
    )
