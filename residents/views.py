
# Create your views here.
from django.shortcuts import render, redirect, get_object_or_404
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.urls import reverse
from datetime import timedelta
from urllib.parse import urlencode
from .models import Resident, DocumentRequest, BarangayOfficeProfile, ResidentServiceLog
from .forms import DocumentRequestForm, ResidentRegistrationForm, ResidentProfileForm
from .notifications import notify_status_update
from collections import defaultdict
from django.db.models import Count, Q


def _require_staff_or_respond(request):
    if not request.user.is_authenticated:
        return redirect(f"{reverse('login')}?next={request.get_full_path()}")

    if request.user.is_staff:
        return None

    return render(request, 'residents/access_denied.html', status=403)


def _normalize_qr_value(raw_value):
    value = (raw_value or '').strip().upper()
    if '/RESIDENTS/SCAN/' in value:
        value = value.split('/RESIDENTS/SCAN/', 1)[1]
        value = value.split('/', 1)[0]
    if value.startswith('BRGY-RESIDENT:'):
        value = value.split('BRGY-RESIDENT:', 1)[1].strip().upper()
    if value in {'...', '…'}:
        return ''
    return ''.join(char for char in value if char.isalnum())


def _get_certificate_meta(request, document_request):
    profile = BarangayOfficeProfile.get_solo()

    captain_name = request.GET.get('captain_name', '').strip() or profile.captain_name
    or_number = request.GET.get('or_number', '').strip() or profile.default_or_number
    control_number = request.GET.get('control_number', '').strip() or profile.default_control_number
    barangay = request.GET.get('barangay', '').strip() or profile.barangay
    city_municipality = request.GET.get('city_municipality', '').strip() or profile.city_municipality
    province = request.GET.get('province', '').strip() or profile.province

    if not control_number and document_request:
        control_number = document_request.tracking_number

    return {
        'captain_name': captain_name,
        'or_number': or_number,
        'control_number': control_number,
        'barangay': barangay,
        'city_municipality': city_municipality,
        'province': province,
    }


def _get_linked_resident(user):
    if not user.is_authenticated:
        return None

    email = (user.email or '').strip()
    if email:
        resident = Resident.objects.filter(email__iexact=email, is_active=True).first()
        if resident:
            return resident

    first_name = (user.first_name or '').strip()
    last_name = (user.last_name or '').strip()
    if first_name and last_name:
        return Resident.objects.filter(
            first_name__iexact=first_name,
            last_name__iexact=last_name,
            is_active=True,
        ).first()

    return None


def _get_resident_document_requests(user):
    if not user.is_authenticated:
        return DocumentRequest.objects.none()

    filters = Q()
    email = (user.email or '').strip()
    if email:
        filters |= Q(email__iexact=email)

    full_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
    if full_name:
        filters |= Q(full_name__iexact=full_name)

    if not filters:
        return DocumentRequest.objects.none()

    return DocumentRequest.objects.filter(filters).order_by('-created_at')


def resident_login(request):
    if request.user.is_authenticated:
        return redirect('resident_portal:dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect(request.GET.get('next') or 'resident_portal:dashboard')
        messages.error(request, 'Invalid username or password.')

    return render(request, 'residents/portal/login.html')


def resident_register(request):
    if request.user.is_authenticated:
        return redirect('resident_portal:dashboard')

    if request.method == 'POST':
        form = ResidentRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Registration successful. Welcome to the resident portal.')
            return redirect('resident_portal:dashboard')
    else:
        form = ResidentRegistrationForm()

    return render(request, 'residents/portal/register.html', {'form': form})


def resident_logout(request):
    if request.method == 'POST':
        logout(request)
    return redirect('resident_portal:login')


@login_required(login_url='resident_portal:login')
def resident_dashboard(request):
    resident = _get_linked_resident(request.user)
    my_requests = _get_resident_document_requests(request.user)

    context = {
        'resident': resident,
        'total_requests': my_requests.count(),
        'pending_requests': my_requests.filter(status__in=['pending', 'processing']).count(),
        'ready_requests': my_requests.filter(status='ready_for_pickup').count(),
        'recent_requests': my_requests[:5],
    }
    return render(request, 'residents/portal/dashboard.html', context)


@login_required(login_url='resident_portal:login')
def resident_profile(request):
    resident = _get_linked_resident(request.user)

    if request.method == 'POST':
        form = ResidentProfileForm(request.POST, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully.')
            return redirect('resident_portal:profile')
    else:
        form = ResidentProfileForm(instance=request.user)

    return render(request, 'residents/portal/profile.html', {
        'form': form,
        'resident': resident,
    })


@login_required(login_url='resident_portal:login')
def resident_requests(request):
    resident = _get_linked_resident(request.user)
    document_requests = _get_resident_document_requests(request.user)
    return render(request, 'residents/portal/requests_list.html', {
        'resident': resident,
        'document_requests': document_requests,
    })


@login_required(login_url='resident_portal:login')
def resident_request_new(request):
    resident = _get_linked_resident(request.user)

    if request.method == 'POST':
        form = DocumentRequestForm(request.POST)
        if form.is_valid():
            document_request = form.save(commit=False)
            if not document_request.email:
                document_request.email = (request.user.email or '').strip()
            if not document_request.full_name.strip():
                document_request.full_name = request.user.get_full_name() or request.user.username
            document_request.save()
            messages.success(request, f'Request submitted. Tracking number: {document_request.tracking_number}')
            return redirect('resident_portal:requests')
    else:
        full_name = request.user.get_full_name().strip() or request.user.username
        initial = {
            'full_name': full_name,
            'email': (request.user.email or '').strip(),
            'contact_number': resident.contact_number if resident else '',
            'address': resident.complete_address if resident else '',
        }
        form = DocumentRequestForm(initial=initial)

    return render(request, 'residents/portal/request_new.html', {
        'form': form,
        'resident': resident,
    })


@login_required(login_url='resident_portal:login')
def resident_announcements(request):
    today = timezone.localdate()
    announcements = [
        {
            'title': 'Barangay Office Advisory',
            'date': today,
            'body': 'Office hours are Monday to Friday, 8:00 AM to 5:00 PM.',
        },
        {
            'title': 'Document Processing Reminder',
            'date': today - timedelta(days=2),
            'body': 'Bring one valid ID when claiming your processed documents.',
        },
        {
            'title': 'Community Clean-up Drive',
            'date': today - timedelta(days=6),
            'body': 'Residents are encouraged to join the clean-up drive this Saturday at 6:30 AM.',
        },
    ]

    return render(request, 'residents/portal/announcements.html', {
        'announcements': announcements,
    })


@login_required
def reports_home(request):
    return render(request, 'residents/reports_home.html')


def scan_resident_qr(request, qr_value):
    denied_response = _require_staff_or_respond(request)
    if denied_response is not None:
        return denied_response

    code = _normalize_qr_value(qr_value)

    if not code:
        params = urlencode({
            'raw': qr_value,
            'code': code,
            'reason': 'invalid',
        })
        return redirect(f"{reverse('residents:qr_diagnostic')}?{params}")

    resident = Resident.objects.filter(qr_code=code).first()
    if resident is None:
        params = urlencode({
            'raw': qr_value,
            'code': code,
            'reason': 'not_found',
        })
        return redirect(f"{reverse('residents:qr_diagnostic')}?{params}")

    ResidentServiceLog.objects.create(
        resident=resident,
        logged_by=request.user,
        action=ResidentServiceLog.ACTION_SCANNED_QR,
        notes='QR scan resolved to resident quick view.',
    )

    messages.success(request, f'Resident loaded: {resident.full_name}')
    return redirect('residents:resident_quick_view', resident_id=resident.pk)


def qr_diagnostic(request):
    denied_response = _require_staff_or_respond(request)
    if denied_response is not None:
        return denied_response

    raw_value = (request.GET.get('raw') or '').strip()
    code = _normalize_qr_value(request.GET.get('code') or raw_value)
    reason = (request.GET.get('reason') or 'not_found').strip().lower()

    context = {
        'raw_value': raw_value or 'N/A',
        'code': code or 'N/A',
        'reason': reason,
    }
    return render(request, 'residents/qr_diagnostic.html', context)


def scan_qr_input(request):
    denied_response = _require_staff_or_respond(request)
    if denied_response is not None:
        return denied_response

    if request.method != 'POST':
        return redirect('residents:scan_test_page')

    raw_value = (request.POST.get('qr_input') or '').strip()
    code = _normalize_qr_value(raw_value)

    if not code:
        params = urlencode({
            'raw': raw_value,
            'code': code,
            'reason': 'invalid',
        })
        return redirect(f"{reverse('residents:qr_diagnostic')}?{params}")

    return redirect('residents:scan_resident_qr', qr_value=code)


def scan_test_page(request):
    denied_response = _require_staff_or_respond(request)
    if denied_response is not None:
        return denied_response

    resident = Resident.objects.filter(is_active=True, qr_code__gt='').order_by('last_name', 'first_name').first()
    base_url = getattr(settings, 'SITE_BASE_URL', '').rstrip('/')
    sample_scan_url = ''

    if resident and base_url:
        sample_scan_url = f"{base_url}/residents/scan/{resident.qr_code}/"

    context = {
        'sample_scan_url': sample_scan_url,
        'sample_qr_code': resident.qr_code if resident else 'N/A',
        'site_base_url': base_url or 'N/A',
    }
    return render(request, 'residents/scan_test.html', context)


def resident_quick_view(request, resident_id):
    denied_response = _require_staff_or_respond(request)
    if denied_response is not None:
        return denied_response

    resident = get_object_or_404(Resident, id=resident_id)
    recent_logs = resident.service_logs.select_related('logged_by')[:8]
    return render(request, 'residents/resident_quick_view.html', {
        'resident': resident,
        'recent_logs': recent_logs,
    })


def resident_service_log_action(request, resident_id):
    denied_response = _require_staff_or_respond(request)
    if denied_response is not None:
        return denied_response

    if request.method != 'POST':
        return redirect('residents:resident_quick_view', resident_id=resident_id)

    resident = get_object_or_404(Resident, id=resident_id)
    action = (request.POST.get('action') or '').strip()

    if action == ResidentServiceLog.ACTION_VISITED_TODAY:
        ResidentServiceLog.objects.create(
            resident=resident,
            logged_by=request.user,
            action=ResidentServiceLog.ACTION_VISITED_TODAY,
            notes='Marked visited today from quick view.',
        )
        messages.success(request, f'Visit logged for {resident.full_name}.')
    else:
        messages.error(request, 'Invalid service log action.')

    return redirect('residents:resident_quick_view', resident_id=resident.id)


def quick_create_document_request(request, resident_id):
    denied_response = _require_staff_or_respond(request)
    if denied_response is not None:
        return denied_response

    if request.method != 'POST':
        return redirect('residents:resident_quick_view', resident_id=resident_id)

    resident = get_object_or_404(Resident, id=resident_id, is_active=True)
    requested_type = (request.POST.get('document_type') or 'certificate_of_residency').strip()
    valid_types = {value for value, _ in DocumentRequest.DOCUMENT_TYPE_CHOICES}
    if requested_type not in valid_types:
        messages.error(request, 'Invalid document type selected.')
        return redirect('residents:resident_quick_view', resident_id=resident_id)

    purpose_by_type = {
        'certificate_of_residency': 'Barangay residency certificate issuance.',
        'certificate_of_indigency': 'Barangay indigency certificate issuance.',
        'barangay_clearance': 'Barangay clearance issuance.',
        'business_clearance': 'Business clearance issuance.',
    }

    document_request = DocumentRequest.objects.create(
        full_name=resident.full_name,
        contact_number=(resident.contact_number or 'N/A').strip()[:15],
        email=(resident.email or '').strip(),
        address=resident.complete_address[:255],
        document_type=requested_type,
        purpose=purpose_by_type.get(requested_type, 'Barangay document issuance.'),
        status='processing',
    )

    type_label = dict(DocumentRequest.DOCUMENT_TYPE_CHOICES).get(requested_type, 'Document')
    messages.success(
        request,
        f'{type_label} request created ({document_request.tracking_number}) for {resident.full_name}.',
    )

    if requested_type == 'certificate_of_residency':
        return redirect('residents:certificate_of_residency_sample_for_request', request_id=document_request.id)
    if requested_type == 'certificate_of_indigency':
        return redirect('residents:certificate_of_indigency_sample_for_request', request_id=document_request.id)
    if requested_type == 'barangay_clearance':
        return redirect('residents:barangay_clearance_sample_for_request', request_id=document_request.id)
    if requested_type == 'business_clearance':
        return redirect('residents:business_clearance_sample_for_request', request_id=document_request.id)
    return redirect('residents:document_requests_queue')


@login_required
def voters_precinct_dashboard(request):
    data = (
        Resident.objects
        .filter(
            voters_id__gt='',
            precinct_number__gt='',
            is_active=True
        )
        .values('precinct_number')
        .annotate(total=Count('id'))
        .order_by('precinct_number')
    )

    labels = [item['precinct_number'] for item in data]
    totals = [item['total'] for item in data]

    return render(request, 'residents/voters_precinct_dashboard.html', {
        'labels': labels,
        'totals': totals,
        'data': data
    })

@login_required
def voters_report(request):
    voters = Resident.objects.filter(
        voters_id__gt='',
        precinct_number__gt='',
        is_active=True
    ).prefetch_related('households').order_by('precinct_number', 'last_name', 'first_name')

    return render(request, 'residents/voters_report.html', {
        'voters': voters
    })


@login_required
def voters_by_precinct_report(request):
    voters = Resident.objects.filter(
        voters_id__gt='',
        precinct_number__gt='',
        is_active=True
    ).prefetch_related('households').order_by('precinct_number', 'last_name', 'first_name')

    precincts = defaultdict(list)

    for voter in voters:
        precincts[voter.precinct_number].append(voter)

    return render(request, 'residents/voters_by_precinct.html', {
        'precincts': dict(precincts)
    })


def request_document(request):
    if request.method == 'POST':
        form = DocumentRequestForm(request.POST)
        if form.is_valid():
            document_request = form.save()
            request.session['latest_document_tracking'] = document_request.tracking_number
            return redirect('residents:document_request_success')
    else:
        form = DocumentRequestForm()

    return render(request, 'residents/request_document.html', {'form': form})


def document_request_success(request):
    tracking_number = request.session.get('latest_document_tracking')
    return render(request, 'residents/document_request_success.html', {
        'tracking_number': tracking_number
    })


def track_document_request(request):
    tracking_number = ''
    document_request = None

    if request.method == 'POST':
        tracking_number = request.POST.get('tracking_number', '').strip().upper()
        if tracking_number:
            document_request = DocumentRequest.objects.filter(
                tracking_number__iexact=tracking_number
            ).first()
            if not document_request:
                messages.error(request, 'Tracking number not found. Please check and try again.')
        else:
            messages.error(request, 'Please enter your tracking number.')

    return render(request, 'residents/track_document_request.html', {
        'tracking_number': tracking_number,
        'document_request': document_request,
    })


@login_required
def document_requests_queue(request):
    status_filter = request.GET.get('status')
    document_requests = DocumentRequest.objects.all().order_by('-created_at')

    if status_filter:
        document_requests = document_requests.filter(status=status_filter)

    return render(request, 'dashboard/document_requests_queue.html', {
        'document_requests': document_requests,
        'status_filter': status_filter,
        'status_choices': DocumentRequest.STATUS_CHOICES,
    })


@login_required
def update_document_request_status(request, request_id):
    if request.method != 'POST':
        return redirect('residents:document_requests_queue')

    document_request = get_object_or_404(DocumentRequest, id=request_id)
    new_status = request.POST.get('status', '')
    remarks = request.POST.get('remarks', '').strip()
    valid_statuses = {status for status, _ in DocumentRequest.STATUS_CHOICES}

    if new_status not in valid_statuses:
        messages.error(request, 'Invalid status selected.')
        return redirect('residents:document_requests_queue')

    previous_status = document_request.status
    document_request.status = new_status
    document_request.remarks = remarks
    document_request.processed_by = request.user
    document_request.save()

    if previous_status != new_status and new_status in {'ready_for_pickup', 'released'}:
        notification_result = notify_status_update(document_request)
        if notification_result['email_sent'] or notification_result['sms_sent']:
            messages.info(request, 'Resident notification sent.')
        else:
            messages.warning(request, 'Status updated, but no notification was sent. Configure email or SMS settings.')

    messages.success(request, f'Request {document_request.tracking_number} updated to {document_request.get_status_display()}.')
    return redirect('residents:document_requests_queue')


@login_required
def reset_document_request_test_data(request):
    if request.method != 'POST':
        return redirect('dashboard:dashboard')

    deleted_count, _ = DocumentRequest.objects.filter(
        remarks__icontains='Seeded test data'
    ).delete()

    if deleted_count > 0:
        messages.success(request, f'{deleted_count} seeded test request(s) removed.')
    else:
        messages.info(request, 'No seeded test requests found.')

    return redirect('dashboard:dashboard')


@login_required
def certificate_of_residency_sample(request, request_id=None):
    document_request = None

    if request_id is not None:
        document_request = get_object_or_404(DocumentRequest, id=request_id)

    resident_name = document_request.full_name if document_request else 'Juan Dela Cruz'
    resident_address = document_request.address if document_request else 'Purok Talisay, Barangay Abgao, Maasin City'
    purpose = document_request.purpose if document_request else 'Employment requirement'

    context = {
        'document_request': document_request,
        'resident_name': resident_name,
        'resident_address': resident_address,
        'purpose': purpose,
        'issued_date': timezone.localdate(),
    }
    context.update(_get_certificate_meta(request, document_request))
    return render(request, 'residents/certificate_of_residency_sample.html', context)


@login_required
def certificate_of_indigency_sample(request, request_id=None):
    document_request = None

    if request_id is not None:
        document_request = get_object_or_404(DocumentRequest, id=request_id)

    resident_name = document_request.full_name if document_request else 'Juan Dela Cruz'
    resident_address = document_request.address if document_request else 'Purok Talisay, Barangay Abgao, Maasin City'
    purpose = document_request.purpose if document_request else 'Financial assistance'

    context = {
        'document_request': document_request,
        'resident_name': resident_name,
        'resident_address': resident_address,
        'purpose': purpose,
        'issued_date': timezone.localdate(),
    }
    context.update(_get_certificate_meta(request, document_request))
    return render(request, 'residents/certificate_of_indigency_sample.html', context)


@login_required
def barangay_clearance_sample(request, request_id=None):
    document_request = None

    if request_id is not None:
        document_request = get_object_or_404(DocumentRequest, id=request_id)

    resident_name = document_request.full_name if document_request else 'Juan Dela Cruz'
    resident_address = document_request.address if document_request else 'Purok Talisay, Barangay Abgao, Maasin City'
    purpose = document_request.purpose if document_request else 'General legal requirement'

    context = {
        'document_request': document_request,
        'resident_name': resident_name,
        'resident_address': resident_address,
        'purpose': purpose,
        'issued_date': timezone.localdate(),
    }
    context.update(_get_certificate_meta(request, document_request))
    return render(request, 'residents/barangay_clearance_sample.html', context)


@login_required
def business_clearance_sample(request, request_id=None):
    document_request = None

    if request_id is not None:
        document_request = get_object_or_404(DocumentRequest, id=request_id)

    resident_name = document_request.full_name if document_request else 'Juan Dela Cruz'
    resident_address = document_request.address if document_request else 'Purok Talisay, Barangay Abgao, Maasin City'
    purpose = document_request.purpose if document_request else 'Business permit processing'

    context = {
        'document_request': document_request,
        'resident_name': resident_name,
        'resident_address': resident_address,
        'purpose': purpose,
        'issued_date': timezone.localdate(),
    }
    context.update(_get_certificate_meta(request, document_request))
    return render(request, 'residents/business_clearance_sample.html', context)


@login_required
def barangay_id_sample(request, resident_id=None):
    resident = None
    if resident_id is not None:
        resident = get_object_or_404(Resident, id=resident_id)

    refresh_qr = request.GET.get('refresh_qr') == '1'
    if resident and refresh_qr:
        if resident.qr_image:
            resident.qr_image.delete(save=False)
        resident.qr_image = None
        resident.save(update_fields=['qr_image'])

    profile = BarangayOfficeProfile.get_solo()
    captain_name = request.GET.get('captain_name', '').strip() or profile.captain_name
    barangay = request.GET.get('barangay', '').strip() or profile.barangay
    city_municipality = request.GET.get('city_municipality', '').strip() or profile.city_municipality
    province = request.GET.get('province', '').strip() or profile.province

    issued_date = timezone.localdate()
    valid_until = issued_date + timedelta(days=365)

    context = {
        'resident': resident,
        'captain_name': captain_name,
        'barangay': barangay,
        'city_municipality': city_municipality,
        'province': province,
        'issued_date': issued_date,
        'valid_until': valid_until,
    }
    return render(request, 'residents/barangay_id_sample.html', context)


def barangay_id_bulk_print(request):
    denied_response = _require_staff_or_respond(request)
    if denied_response is not None:
        return denied_response

    if request.method != 'POST':
        return redirect('dashboard:residents_list')

    selected_ids = request.POST.getlist('resident_ids')
    if not selected_ids:
        messages.warning(request, 'Select at least one resident to print IDs.')
        return redirect('dashboard:residents_list')

    queryset = Resident.objects.filter(id__in=selected_ids, is_active=True)
    residents_by_id = {str(resident.id): resident for resident in queryset}
    residents = [residents_by_id[resident_id] for resident_id in selected_ids if resident_id in residents_by_id]

    if not residents:
        messages.warning(request, 'No valid resident records found for selected IDs.')
        return redirect('dashboard:residents_list')

    profile = BarangayOfficeProfile.get_solo()
    captain_name = profile.captain_name
    barangay = profile.barangay
    city_municipality = profile.city_municipality
    province = profile.province

    issued_date = timezone.localdate()
    valid_until = issued_date + timedelta(days=365)

    context = {
        'residents': residents,
        'resident_count': len(residents),
        'captain_name': captain_name,
        'barangay': barangay,
        'city_municipality': city_municipality,
        'province': province,
        'issued_date': issued_date,
        'valid_until': valid_until,
    }
    return render(request, 'residents/barangay_id_bulk_print.html', context)


@login_required
def qr_frontdesk_sop_sheet(request):
    profile = BarangayOfficeProfile.get_solo()

    context = {
        'office_name': profile.office_name,
        'barangay': profile.barangay,
        'city_municipality': profile.city_municipality,
        'province': profile.province,
        'captain_name': profile.captain_name,
        'printed_date': timezone.localdate(),
    }
    return render(request, 'residents/qr_frontdesk_sop_sheet.html', context)
