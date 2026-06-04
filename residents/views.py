
# Create your views here.
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from .models import Resident, DocumentRequest, BarangayOfficeProfile
from .forms import DocumentRequestForm
from .notifications import notify_status_update
from collections import defaultdict
from django.db.models import Count


def _get_certificate_meta(request, document_request):
    profile = BarangayOfficeProfile.get_solo()

    captain_name = request.GET.get('captain_name', '').strip() or profile.captain_name
    or_number = request.GET.get('or_number', '').strip() or profile.default_or_number
    control_number = request.GET.get('control_number', '').strip() or profile.default_control_number

    if not control_number and document_request:
        control_number = document_request.tracking_number

    return {
        'captain_name': captain_name,
        'or_number': or_number,
        'control_number': control_number,
    }


@login_required
def reports_home(request):
    return render(request, 'residents/reports_home.html')


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
    resident_address = document_request.address if document_request else 'Zone 1, Barangay Abgao, Maasin City'
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
    resident_address = document_request.address if document_request else 'Zone 1, Barangay Abgao, Maasin City'
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
