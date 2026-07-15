from datetime import date
import csv

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.core.exceptions import PermissionDenied
from django.db.models import Count, Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from .audit_utils import apply_inventory_legacy_fix, build_inventory_legacy_audit, export_inventory_legacy_audit_rows
from .code_utils import generate_next_asset_code
from .forms import AssetCreateForm, AssetUpdateForm
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


def _ensure_staff_inventory_user(request, message):
    if not request.user.is_staff:
        raise PermissionDenied(message)


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


def _search_assets(queryset, search_query):
    if not search_query:
        return queryset

    return queryset.filter(
        Q(property_number__icontains=search_query)
        | Q(description__icontains=search_query)
        | Q(category__name__icontains=search_query)
        | Q(accountability_status__icontains=search_query)
        | Q(serial_number__icontains=search_query)
        | Q(brand_model__icontains=search_query)
        | Q(responsible_person__username__icontains=search_query)
        | Q(responsible_person__first_name__icontains=search_query)
        | Q(responsible_person__last_name__icontains=search_query)
        | Q(responsible_role__icontains=search_query)
        | Q(location__icontains=search_query)
    )


def _paginate_assets(request, assets_queryset):
    per_page_options = [10, 25, 50]
    per_page_raw = request.GET.get('per_page', '').strip()

    try:
        per_page = int(per_page_raw)
    except ValueError:
        per_page = per_page_options[0]

    if per_page not in per_page_options:
        per_page = per_page_options[0]

    paginator = Paginator(assets_queryset, per_page)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    return page_obj, per_page, per_page_options


def _render_asset_register(request, queryset, title, subtitle, clear_url_name):
    search_query = request.GET.get('q', '').strip()
    assets = _search_assets(queryset.select_related('category', 'responsible_person'), search_query).order_by('property_number')
    page_obj, per_page, per_page_options = _paginate_assets(request, assets)

    context = {
        'assets': page_obj.object_list,
        'page_obj': page_obj,
        'selected_per_page': per_page,
        'per_page_options': per_page_options,
        'search_query': search_query,
        'register_title': title,
        'register_subtitle': subtitle,
        'clear_url_name': clear_url_name,
        'print_url_name': None,
        'export_url_name': None,
    }
    return render(request, 'inventory/asset_register.html', context)


def _active_asset_register_queryset():
    return Asset.objects.filter(status=Asset.StatusChoices.ACTIVE)


def _legacy_asset_register_queryset():
    return Asset.objects.filter(status__in=[Asset.StatusChoices.DISPOSED, Asset.StatusChoices.LOST])


def _disposal_evaluation_register_queryset():
    disposal_q = Q(condition__in=[Asset.ConditionChoices.UNSERVICEABLE, Asset.ConditionChoices.FOR_DISPOSAL]) | Q(
        status=Asset.StatusChoices.UNDER_REPAIR
    )
    return Asset.objects.filter(disposal_q).exclude(status=Asset.StatusChoices.DISPOSED)


def _register_assets_and_search(queryset, search_query):
    return _search_assets(queryset.select_related('category', 'responsible_person'), search_query).order_by('property_number')


def _register_meta(register_key):
    registers = {
        'active': {
            'title': 'Register 1 - Active Asset Registry',
            'subtitle': 'Assets currently in active service.',
            'clear_url_name': 'inventory:register_active_assets',
            'print_url_name': 'inventory:register_active_assets_print',
            'export_url_name': 'inventory:register_active_assets_export',
            'queryset': _active_asset_register_queryset,
        },
        'legacy': {
            'title': 'Register 2 - Legacy Assets',
            'subtitle': 'Historical records of lost and disposed assets.',
            'clear_url_name': 'inventory:register_legacy_assets',
            'print_url_name': 'inventory:register_legacy_assets_print',
            'export_url_name': 'inventory:register_legacy_assets_export',
            'queryset': _legacy_asset_register_queryset,
        },
        'disposal': {
            'title': 'Register 3 - Disposal Evaluation Register',
            'subtitle': 'Assets flagged for assessment, repair decision, or disposal recommendation.',
            'clear_url_name': 'inventory:register_disposal_evaluation',
            'print_url_name': 'inventory:register_disposal_evaluation_print',
            'export_url_name': 'inventory:register_disposal_evaluation_export',
            'queryset': _disposal_evaluation_register_queryset,
        },
    }
    return registers[register_key]


def _render_named_register(request, register_key):
    meta = _register_meta(register_key)
    search_query = request.GET.get('q', '').strip()
    assets = _register_assets_and_search(meta['queryset'](), search_query)
    page_obj, per_page, per_page_options = _paginate_assets(request, assets)

    context = {
        'assets': page_obj.object_list,
        'page_obj': page_obj,
        'selected_per_page': per_page,
        'per_page_options': per_page_options,
        'search_query': search_query,
        'register_title': meta['title'],
        'register_subtitle': meta['subtitle'],
        'clear_url_name': meta['clear_url_name'],
        'print_url_name': meta['print_url_name'],
        'export_url_name': meta['export_url_name'],
    }
    return render(request, 'inventory/asset_register.html', context)


def _render_register_print(request, register_key):
    meta = _register_meta(register_key)
    search_query = request.GET.get('q', '').strip()
    assets = _register_assets_and_search(meta['queryset'](), search_query)

    context = {
        'assets': assets,
        'search_query': search_query,
        'register_title': meta['title'],
        'register_subtitle': meta['subtitle'],
        'generated_on': timezone.localtime(),
    }
    return render(request, 'inventory/print_asset_register.html', context)


def _export_register_csv(request, register_key):
    meta = _register_meta(register_key)
    search_query = request.GET.get('q', '').strip()
    assets = _register_assets_and_search(meta['queryset'](), search_query)

    file_name_map = {
        'active': 'register_1_active_asset_registry.csv',
        'legacy': 'register_2_legacy_assets.csv',
        'disposal': 'register_3_disposal_evaluation.csv',
    }

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{file_name_map[register_key]}"'

    writer = csv.writer(response)
    writer.writerow([
        'register',
        'property_number',
        'description',
        'category',
        'accountability_status',
        'status',
        'condition',
        'location',
        'responsible_person',
        'date_acquired',
        'cost',
    ])

    for asset in assets:
        writer.writerow([
            meta['title'],
            asset.property_number,
            asset.description,
            asset.category.get_name_display(),
            asset.get_accountability_status_display(),
            asset.get_status_display(),
            asset.get_condition_display(),
            asset.location,
            str(asset.responsible_person) if asset.responsible_person else '',
            asset.date_acquired.isoformat() if asset.date_acquired else '',
            asset.cost if asset.cost is not None else '',
        ])

    return response


@login_required
def index(request):
    return render(request, 'inventory/index.html')


@login_required
@require_POST
def load_sample_entries(request):
    _ensure_staff_inventory_user(request, 'Only staff users can load inventory sample entries.')

    result = load_inventory_sample_entries()
    messages.success(
        request,
        f"Sample entries loaded. Created: {result['created']} | Updated: {result['updated']} | Total: {result['total']}",
    )
    return redirect('inventory:index')


@login_required
def legacy_values_audit(request):
    _ensure_staff_inventory_user(request, 'Only staff users can run inventory legacy audits.')

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
@require_POST
def legacy_values_audit_fix(request):
    _ensure_staff_inventory_user(request, 'Only staff users can apply inventory legacy fixes.')

    section_key = request.POST.get('section_key', '').strip()
    raw_value = request.POST.get('raw_value', '')
    limit_param = request.POST.get('limit', '50')

    try:
        result = apply_inventory_legacy_fix(section_key=section_key, raw_value=raw_value)
    except ValueError:
        messages.error(request, 'Invalid legacy audit fix request.')
    else:
        if result['suggestion'] == 'N/A':
            messages.warning(request, f'No automatic fix is available for "{raw_value or "(empty)"}".')
        elif result['updated']:
            messages.success(
                request,
                f'Applied suggested value {result["suggestion"]} to {result["updated"]} record(s).',
            )
        else:
            messages.info(request, f'No matching records were updated for "{raw_value or "(empty)"}".')

    return redirect(f"{reverse('inventory:legacy_values_audit')}?limit={limit_param}")


@login_required
def legacy_values_audit_export(request):
    _ensure_staff_inventory_user(request, 'Only staff users can export inventory legacy audits.')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="inventory_legacy_values_audit.csv"'

    writer = csv.writer(response)
    writer.writerow(['section', 'section_key', 'value', 'count', 'suggestion'])
    for row in export_inventory_legacy_audit_rows():
        writer.writerow([
            row['section'],
            row['section_key'],
            row['value'],
            row['count'],
            row['suggestion'],
        ])

    return response


@login_required
def item_list(request):
    return _render_asset_register(
        request=request,
        queryset=Asset.objects.all(),
        title='Asset Registry',
        subtitle='Browse all registered assets and open full records.',
        clear_url_name='inventory:item_list',
    )


@login_required
def generate_asset_code(request):
    category_id = request.GET.get('category_id', '').strip()

    if not category_id.isdigit():
        return JsonResponse({'error': 'Invalid category.'}, status=400)

    category = get_object_or_404(Category, pk=int(category_id))
    code = generate_next_asset_code(category.name)
    return JsonResponse({'code': code})


@login_required
def register_active_assets(request):
    return _render_named_register(request, 'active')


@login_required
def register_legacy_assets(request):
    return _render_named_register(request, 'legacy')


@login_required
def register_disposal_evaluation(request):
    return _render_named_register(request, 'disposal')


@login_required
def register_active_assets_print(request):
    return _render_register_print(request, 'active')


@login_required
def register_legacy_assets_print(request):
    return _render_register_print(request, 'legacy')


@login_required
def register_disposal_evaluation_print(request):
    return _render_register_print(request, 'disposal')


@login_required
def register_active_assets_export(request):
    return _export_register_csv(request, 'active')


@login_required
def register_legacy_assets_export(request):
    return _export_register_csv(request, 'legacy')


@login_required
def register_disposal_evaluation_export(request):
    return _export_register_csv(request, 'disposal')


@login_required
def asset_create(request):
    next_url = _safe_next_url(request, request.GET.get('next') or request.POST.get('next'))

    if request.method == 'POST':
        form = AssetCreateForm(request.POST)
        if form.is_valid():
            asset = form.save()
            messages.success(request, f'Asset {asset.property_number} added to registry.')
            return redirect(next_url or 'inventory:item_list')
    else:
        form = AssetCreateForm()

    context = {
        'form': form,
        'next_url': next_url,
    }
    return render(request, 'inventory/asset_entry_form.html', context)


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
def asset_delete(request, asset_id):
    asset = get_object_or_404(Asset, pk=asset_id)
    next_url = _safe_next_url(request, request.POST.get('next'))
    property_number = asset.property_number
    asset.delete()
    messages.success(request, f'Asset {property_number} deleted from registry.')
    return redirect(next_url or 'inventory:item_list')


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
