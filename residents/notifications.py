import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail import send_mail


logger = logging.getLogger(__name__)


def _send_email_notification(document_request):
    if not document_request.email:
        return False, 'No email provided by resident.'

    status_label = document_request.get_status_display()
    subject = f'Document Request Update: {document_request.tracking_number}'
    message = (
        f'Hello {document_request.full_name},\n\n'
        f'Your requested document is now: {status_label}.\n'
        f'Tracking Number: {document_request.tracking_number}\n'
        f'Document Type: {document_request.get_document_type_display()}\n\n'
        f'Remarks: {document_request.remarks or "None"}\n\n'
        'Please coordinate with the barangay office for claiming details.\n\n'
        'Thank you.'
    )
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@barangay.local')

    send_mail(
        subject,
        message,
        from_email,
        [document_request.email],
        fail_silently=False,
    )
    return True, 'Email notification sent.'


def _send_sms_notification(document_request):
    sms_webhook_url = getattr(settings, 'SMS_WEBHOOK_URL', '').strip()
    if not sms_webhook_url:
        return False, 'SMS webhook not configured.'

    payload = {
        'to': document_request.contact_number,
        'message': (
            f'Barangay update: {document_request.tracking_number} is now '
            f'{document_request.get_status_display()}. '
            f'Remarks: {document_request.remarks or "None"}'
        ),
    }

    request_obj = urllib.request.Request(
        sms_webhook_url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urllib.request.urlopen(request_obj, timeout=8) as response:
            if 200 <= response.status < 300:
                return True, 'SMS notification sent.'
    except urllib.error.URLError as exc:
        logger.warning('SMS webhook call failed: %s', exc)
        return False, 'SMS sending failed.'

    return False, 'SMS provider returned non-success response.'


def notify_status_update(document_request):
    email_sent = False
    sms_sent = False
    details = []

    try:
        email_sent, email_detail = _send_email_notification(document_request)
        details.append(email_detail)
    except Exception as exc:
        logger.warning('Email notification failed: %s', exc)
        details.append('Email sending failed.')

    try:
        sms_sent, sms_detail = _send_sms_notification(document_request)
        details.append(sms_detail)
    except Exception as exc:
        logger.warning('SMS notification failed: %s', exc)
        details.append('SMS sending failed.')

    return {
        'email_sent': email_sent,
        'sms_sent': sms_sent,
        'details': details,
    }