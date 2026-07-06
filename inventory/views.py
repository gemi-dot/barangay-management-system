from datetime import date

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db.models import Count
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from .audit_utils import build_inventory_legacy_audit
from .forms import AssetUpdateForm
from .models import Asset, Category
from .sample_data import load_inventory_sample_entries


def _parse_date_param(raw_value):
    if not raw_value:
        return None
    try:
        return date.fromisoformat(raw_value)
    except ValueError:
        return None


def _asset_filter_state(request):
    office = request.GET.get('office', '').strip()
    category_raw = request.GET.get('category', '').strip()
    date_from_raw = request.GET.get('date_from', '').strip()
    date_to_raw = request.GET.get('date_to', '').strip()

    category_id = None
    if category_raw.isdigit():
        category_id = int(category_raw)

    return {
        'office': office,
        'category_id': category_id,
        'date_from': _parse_date_param(date_from_raw),
        'date_to': _parse_date_param(date_to_raw),
        'date_from_raw': date_from_raw,
        'date_to_raw': date_to_raw,
    }


def _apply_asset_filters(queryset, state):
    if state['office']:
        queryset = queryset.filter(location=state['office'])
    if state['category_id']:
        queryset = queryset.filter(category_id=state['category_id'])
    if state['date_from']:
        queryset = queryset.filter(date_acquired__gte=state['date_from'])
    if state['date_to']:
        queryset = queryset.filter(date_acquired__lte=state['date_to'])
    return queryset


def _report_filter_context(state):
    offices = (
        Asset.objects.exclude(location='')
        .values_list('location', flat=True)
        .distinct()
        .order_by('location')
    )
    categories = Category.objects.order_by('name')

    return {
        'offices': offices,
        'categories': categories,
        'selected_office': state['office'],
        'selected_category': str(state['category_id']) if state['category_id'] else '',
        'selected_date_from': state['date_from_raw'],
        'selected_date_to': state['date_to_raw'],
    }


def _category_label(choice_value):
    try:
        return Category.NameChoices(choice_value).label
    except ValueError:
        return choice_value or 'Unknown'


def _safe_next_url(request, candidate):
    if candidate and url_has_allowed_host_and_scheme(
        url=candidate,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return candidate
    return ''


def _mark_asset_as_damaged(asset):
    update_fields = []

    if asset.condition != Asset.ConditionChoices.UNSERVICEABLE:
        asset.condition = Asset.ConditionChoices.UNSERVICEABLE
        update_fields.append('condition')

    if asset.status != Asset.StatusChoices.DISPOSED and asset.status != Asset.StatusChoices.UNDER_REPAIR:
        asset.status = Asset.StatusChoices.UNDER_REPAIR
        update_fields.append('status')

    if update_fields:
        asset.save(update_fields=update_fields)

    return bool(update_fields)


def _mark_asset_as_missing(asset):
    if asset.status == Asset.StatusChoices.LOST:
        return False

    asset.status = Asset.StatusChoices.LOST
    asset.save(update_fields=['status'])
    return True


@login_required
def index(request):
    return render(request, 'inventory/index.html')


@login_required
@require_POST
def load_sample_entries(request):
    if not request.user.is_staff:
        raise PermissionDenied('Only staff users can load inventory sample entries.')

    result = load_inventory_sample_entries()
    messages.success(
        request,
        f"Sample entries loaded. Created: {result['created']} | Updated: {result['updated']} | Total: {result['total']}",
    )
    return redirect('inventory:index')


@login_required
def legacy_values_audit(request):
    if not request.user.is_staff:
        raise PermissionDenied('Only staff users can run inventory legacy audits.')

    limit_param = request.GET.get('limit', '50')
    try:
        limit = int(limit_param)
    except ValueError:
        limit = 50

    audit = build_inventory_legacy_audit(limit=limit)
    context = {
        'sections': audit['sections'],
        'total_unmatched': audit['total_unmatched'],
        'limit': audit['limit'],
        'available_limits': [50, 200],
    }
    return render(request, 'inventory/legacy_values_audit.html', context)


@login_required
def item_list(request):
    assets = Asset.objects.select_related('category', 'responsible_person').order_by('property_number')
    return render(request, 'inventory/item_list.html', {'assets': assets})


@login_required
def stock_in(request):
    return render(request, 'inventory/stock_in.html')


@login_required
def stock_out(request):
    return render(request, 'inventory/stock_out.html')


@login_required
def asset_detail(request, asset_id):
    asset = get_object_or_404(Asset.objects.select_related('category', 'responsible_person'), pk=asset_id)
    return render(request, 'inventory/asset_detail.html', {'asset': asset})


@login_required
def asset_edit(request, asset_id):
    asset = get_object_or_404(Asset.objects.select_related('category', 'responsible_person'), pk=asset_id)
    next_url = _safe_next_url(request, request.GET.get('next') or request.POST.get('next'))

    if request.method == 'POST':
        form = AssetUpdateForm(request.POST, instance=asset)
        if form.is_valid():
            form.save()
            messages.success(request, f'Asset {asset.property_number} updated successfully.')
            return redirect(next_url or 'inventory:asset_detail', asset_id=asset.id)
    else:
        form = AssetUpdateForm(instance=asset)

    context = {
        'asset': asset,
        'form': form,
        'next_url': next_url,
    }
    return render(request, 'inventory/asset_edit.html', context)


@login_required
@require_POST
def asset_mark_damaged(request, asset_id):
    asset = get_object_or_404(Asset, pk=asset_id)
    next_url = _safe_next_url(request, request.POST.get('next'))

    changed = _mark_asset_as_damaged(asset)
    if changed:
        messages.success(request, f'Asset {asset.property_number} marked as damaged.')
    else:
        messages.info(request, f'Asset {asset.property_number} is already tagged as damaged.')

    return redirect(next_url or 'inventory:asset_detail', asset_id=asset.id)


@login_required
@require_POST
def asset_mark_missing(request, asset_id):
    asset = get_object_or_404(Asset, pk=asset_id)
    next_url = _safe_next_url(request, request.POST.get('next'))

    changed = _mark_asset_as_missing(asset)
    if changed:
        messages.success(request, f'Asset {asset.property_number} marked as missing.')
    else:
        messages.info(request, f'Asset {asset.property_number} is already tagged as missing.')

    return redirect(next_url or 'inventory:asset_detail', asset_id=asset.id)


@login_required
def scan_asset_qr(request, qr_code):
    asset = get_object_or_404(Asset, qr_code=qr_code.upper())
    return redirect('inventory:asset_detail', asset_id=asset.id)


@login_required
def report_assets_by_office(request):
    state = _asset_filter_state(request)
    filtered_assets = _apply_asset_filters(Asset.objects.all(), state)
    rows = (
        filtered_assets.values('location')
        .annotate(total_assets=Count('id'))
        .order_by('location')
    )
    context = {
        'rows': rows,
        'total_assets': filtered_assets.count(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/reports_assets_by_office.html', context)


@login_required
def report_assets_by_category(request):
    state = _asset_filter_state(request)
    filtered_assets = _apply_asset_filters(Asset.objects.select_related('category'), state)
    rows = (
        filtered_assets.values('category__name')
        .annotate(total_assets=Count('id'))
        .order_by('category__name')
    )
    category_rows = [
        {
            'category': _category_label(row['category__name']),
            'total_assets': row['total_assets'],
        }
        for row in rows
    ]
    context = {
        'category_rows': category_rows,
        'total_assets': filtered_assets.count(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/reports_assets_by_category.html', context)


@login_required
def report_damaged_items(request):
    state = _asset_filter_state(request)
    assets = _apply_asset_filters(
        Asset.objects.filter(condition=Asset.ConditionChoices.UNSERVICEABLE).select_related('category'),
        state,
    ).order_by('property_number')
    context = {
        'assets': assets,
        'count': assets.count(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/reports_damaged_items.html', context)


@login_required
def report_missing_items(request):
    state = _asset_filter_state(request)
    assets = _apply_asset_filters(
        Asset.objects.filter(status=Asset.StatusChoices.LOST).select_related('category'),
        state,
    ).order_by('property_number')
    context = {
        'assets': assets,
        'count': assets.count(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/reports_missing_items.html', context)


@login_required
def report_annual_physical_inventory(request):
    state = _asset_filter_state(request)
    current_year = timezone.localdate().year
    year_param = request.GET.get('year')
    try:
        year = int(year_param) if year_param else current_year
    except ValueError:
        year = current_year

    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)

    base_assets = _apply_asset_filters(Asset.objects.select_related('category'), state)
    counted_assets_qs = base_assets.filter(last_inventory_date__range=(start_date, end_date)).order_by('property_number')
    not_counted_assets_qs = base_assets.exclude(last_inventory_date__range=(start_date, end_date)).order_by('property_number')

    context = {
        'year': year,
        'current_year': current_year,
        'total_assets': base_assets.count(),
        'counted_assets': counted_assets_qs,
        'counted_assets_total': counted_assets_qs.count(),
        'not_counted_assets': not_counted_assets_qs,
        'not_counted_assets_total': not_counted_assets_qs.count(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/reports_annual_physical_inventory.html', context)


@login_required
def report_assets_by_office_print(request):
    state = _asset_filter_state(request)
    filtered_assets = _apply_asset_filters(Asset.objects.all(), state)
    rows = (
        filtered_assets.values('location')
        .annotate(total_assets=Count('id'))
        .order_by('location')
    )
    context = {
        'rows': rows,
        'total_assets': filtered_assets.count(),
        'generated_on': timezone.localtime(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/print_assets_by_office.html', context)


@login_required
def report_assets_by_category_print(request):
    state = _asset_filter_state(request)
    filtered_assets = _apply_asset_filters(Asset.objects.select_related('category'), state)
    rows = (
        filtered_assets.values('category__name')
        .annotate(total_assets=Count('id'))
        .order_by('category__name')
    )
    category_rows = [
        {
            'category': _category_label(row['category__name']),
            'total_assets': row['total_assets'],
        }
        for row in rows
    ]
    context = {
        'category_rows': category_rows,
        'total_assets': filtered_assets.count(),
        'generated_on': timezone.localtime(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/print_assets_by_category.html', context)


@login_required
def report_damaged_items_print(request):
    state = _asset_filter_state(request)
    assets = _apply_asset_filters(
        Asset.objects.filter(condition=Asset.ConditionChoices.UNSERVICEABLE).select_related('category'),
        state,
    ).order_by('property_number')
    context = {
        'assets': assets,
        'count': assets.count(),
        'generated_on': timezone.localtime(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/print_damaged_items.html', context)


@login_required
def report_missing_items_print(request):
    state = _asset_filter_state(request)
    assets = _apply_asset_filters(
        Asset.objects.filter(status=Asset.StatusChoices.LOST).select_related('category'),
        state,
    ).order_by('property_number')
    context = {
        'assets': assets,
        'count': assets.count(),
        'generated_on': timezone.localtime(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/print_missing_items.html', context)


@login_required
def report_annual_physical_inventory_print(request):
    state = _asset_filter_state(request)
    current_year = timezone.localdate().year
    year_param = request.GET.get('year')
    try:
        year = int(year_param) if year_param else current_year
    except ValueError:
        year = current_year

    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    base_assets = _apply_asset_filters(Asset.objects.select_related('category'), state)
    counted_assets_qs = base_assets.filter(last_inventory_date__range=(start_date, end_date)).order_by('property_number')
    not_counted_assets_qs = base_assets.exclude(last_inventory_date__range=(start_date, end_date)).order_by('property_number')

    context = {
        'year': year,
        'total_assets': base_assets.count(),
        'counted_assets': counted_assets_qs,
        'counted_assets_total': counted_assets_qs.count(),
        'not_counted_assets': not_counted_assets_qs,
        'not_counted_assets_total': not_counted_assets_qs.count(),
        'generated_on': timezone.localtime(),
        **_report_filter_context(state),
    }
    return render(request, 'inventory/print_annual_physical_inventory.html', context)
