from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from collections import defaultdict
from residents.models import Resident, Household, DocumentRequest
from bhw_reports.models import (
    SeniorCitizenReport, SariSariStoreReport, 
    FourPsBeneficiaryReport, PregnancyReport, HealthReport
)

# Create your views here.

@login_required
def dashboard_view(request):
    """Main dashboard with summary statistics"""
    
    # Basic resident statistics
    total_residents = Resident.objects.filter(is_active=True).count()
    total_households = Household.objects.count()
    
    # Demographics
    male_residents = Resident.objects.filter(gender='M', is_active=True).count()
    female_residents = Resident.objects.filter(gender='F', is_active=True).count()
    
    # Age groups
    today = timezone.now().date()
    children = Resident.objects.filter(
        date_of_birth__gt=today - timedelta(days=18*365), 
        is_active=True
    ).count()
    
    adults = Resident.objects.filter(
        date_of_birth__lte=today - timedelta(days=18*365),
        date_of_birth__gt=today - timedelta(days=60*365),
        is_active=True
    ).count()
    
    seniors = Resident.objects.filter(
        date_of_birth__lte=today - timedelta(days=60*365),
        is_active=True
    ).count()
    
    # Special categories
    pwd_count = Resident.objects.filter(is_pwd=True, is_active=True).count()
    senior_citizens = Resident.objects.filter(is_senior_citizen=True, is_active=True).count()
    fourps_beneficiaries = Resident.objects.filter(is_4ps_beneficiary=True, is_active=True).count()
    solo_parents = Resident.objects.filter(is_solo_parent=True, is_active=True).count()
    
    # BHW Reports statistics
    senior_reports = SeniorCitizenReport.objects.filter(is_active=True).count()
    active_businesses = SariSariStoreReport.objects.filter(is_active=True).count()
    active_fourps = FourPsBeneficiaryReport.objects.filter(is_active=True).count()
    active_pregnancies = PregnancyReport.objects.filter(
        pregnancy_outcome='ongoing', 
        is_active=True
    ).count()
    
    # Recent health reports
    recent_health_reports = HealthReport.objects.filter(
        report_date__gte=today - timedelta(days=7)
    ).count()
    
    # Zone distribution with percentage calculation
    zone_distribution_raw = Resident.objects.filter(is_active=True).values('zone').annotate(
        count=Count('id')
    ).order_by('zone')
    
    # Add percentage to each zone
    zone_distribution = []
    for zone in zone_distribution_raw:
        percentage = (zone['count'] * 100 / total_residents) if total_residents > 0 else 0
        zone_distribution.append({
            'zone': zone['zone'],
            'count': zone['count'],
            'percentage': round(percentage, 1)
        })
    
    # Civil status distribution
    civil_status_distribution = Resident.objects.filter(is_active=True).values('civil_status').annotate(
        count=Count('id')
    ).order_by('civil_status')
    
    # Employment status distribution
    employment_distribution = Resident.objects.filter(is_active=True).values('employment_status').annotate(
        count=Count('id')
    ).order_by('employment_status')

    # Document request quick metrics
    ready_today_count = DocumentRequest.objects.filter(
        status='ready_for_pickup',
        updated_at__date=today,
    ).count()
    currently_ready_count = DocumentRequest.objects.filter(status='ready_for_pickup').count()
    released_today_count = DocumentRequest.objects.filter(
        status='released',
        updated_at__date=today,
    ).count()
    pending_document_requests = DocumentRequest.objects.filter(
        status__in=['pending', 'processing']
    ).count()
    latest_ready_requests = DocumentRequest.objects.filter(
        status='ready_for_pickup'
    ).order_by('-updated_at')[:5]
    
    context = {
        'total_residents': total_residents,
        'total_households': total_households,
        'male_residents': male_residents,
        'female_residents': female_residents,
        'children': children,
        'adults': adults,
        'seniors': seniors,
        'pwd_count': pwd_count,
        'senior_citizens': senior_citizens,
        'fourps_beneficiaries': fourps_beneficiaries,
        'solo_parents': solo_parents,
        'senior_reports': senior_reports,
        'active_businesses': active_businesses,
        'active_fourps': active_fourps,
        'active_pregnancies': active_pregnancies,
        'recent_health_reports': recent_health_reports,
        'zone_distribution': zone_distribution,
        'civil_status_distribution': civil_status_distribution,
        'employment_distribution': employment_distribution,
        'ready_today_count': ready_today_count,
        'currently_ready_count': currently_ready_count,
        'released_today_count': released_today_count,
        'pending_document_requests': pending_document_requests,
        'latest_ready_requests': latest_ready_requests,
    }
    
    return render(request, 'dashboard/dashboard.html', context)


@login_required
def senior_citizens_report(request):
    """Senior Citizens Report View"""
    senior_citizens = Resident.objects.filter(is_senior_citizen=True, is_active=True)
    senior_reports = SeniorCitizenReport.objects.filter(is_active=True).select_related('resident')
    
    # Calculate seniors needing health assessment
    seniors_with_reports = senior_reports.count()
    total_seniors = senior_citizens.count()
    seniors_needing_assessment = total_seniors - seniors_with_reports
    
    context = {
        'senior_citizens': senior_citizens,
        'senior_reports': senior_reports,
        'total_seniors': total_seniors,
        'seniors_with_reports': seniors_with_reports,
        'seniors_needing_assessment': max(0, seniors_needing_assessment),  # Ensure non-negative
    }
    
    return render(request, 'dashboard/senior_citizens_report.html', context)


@login_required
def businesses_report(request):
    """Sari-Sari Stores and Carenderias Report View"""
    businesses = SariSariStoreReport.objects.filter(is_active=True).select_related('owner')
    
    # Business type breakdown
    sari_sari_count = businesses.filter(business_type='sari_sari').count()
    carenderia_count = businesses.filter(business_type='carenderia').count()
    both_count = businesses.filter(business_type='both').count()
    
    # Compliance statistics
    sanitation_compliant = businesses.filter(has_proper_sanitation=True).count()
    fire_safety_compliant = businesses.filter(has_fire_safety_measures=True).count()
    
    context = {
        'businesses': businesses,
        'total_businesses': businesses.count(),
        'sari_sari_count': sari_sari_count,
        'carenderia_count': carenderia_count,
        'both_count': both_count,
        'sanitation_compliant': sanitation_compliant,
        'fire_safety_compliant': fire_safety_compliant,
    }
    
    return render(request, 'dashboard/businesses_report.html', context)


@login_required
def fourps_report(request):
    """4Ps Beneficiaries Report View"""
    fourps_beneficiaries = FourPsBeneficiaryReport.objects.filter(is_active=True).select_related('beneficiary')
    
    # Compliance statistics
    education_compliant = fourps_beneficiaries.filter(education_compliance=True).count()
    health_compliant = fourps_beneficiaries.filter(health_compliance=True).count()
    fds_compliant = fourps_beneficiaries.filter(family_development_sessions=True).count()
    
    context = {
        'fourps_beneficiaries': fourps_beneficiaries,
        'total_beneficiaries': fourps_beneficiaries.count(),
        'education_compliant': education_compliant,
        'health_compliant': health_compliant,
        'fds_compliant': fds_compliant,
    }
    
    return render(request, 'dashboard/fourps_report.html', context)


@login_required
def pregnancy_report(request):
    """Pregnancy Report View"""
    active_pregnancies = PregnancyReport.objects.filter(
        pregnancy_outcome='ongoing', 
        is_active=True
    ).select_related('pregnant_woman')
    
    # Risk assessment
    high_risk_pregnancies = active_pregnancies.filter(high_risk_pregnancy=True).count()
    
    # Trimester distribution
    first_trimester = []
    second_trimester = []
    third_trimester = []
    
    # Calculate due dates and trimester info
    today = timezone.now().date()
    next_month = today + timedelta(days=30)
    
    for pregnancy in active_pregnancies:
        # Add due_soon flag to each pregnancy object
        pregnancy.due_soon = pregnancy.expected_due_date <= next_month
        
        # Calculate trimester
        if pregnancy.age_of_gestation_weeks:
            if pregnancy.age_of_gestation_weeks <= 12:
                first_trimester.append(pregnancy)
            elif pregnancy.age_of_gestation_weeks <= 28:
                second_trimester.append(pregnancy)
            else:
                third_trimester.append(pregnancy)
    
    # Due dates in next 30 days
    upcoming_deliveries = active_pregnancies.filter(
        expected_due_date__lte=next_month
    ).order_by('expected_due_date')
    
    context = {
        'active_pregnancies': active_pregnancies,
        'total_pregnancies': active_pregnancies.count(),
        'high_risk_pregnancies': high_risk_pregnancies,
        'first_trimester_count': len(first_trimester),
        'second_trimester_count': len(second_trimester),
        'third_trimester_count': len(third_trimester),
        'upcoming_deliveries': upcoming_deliveries,
    }
    
    return render(request, 'dashboard/pregnancy_report.html', context)


@login_required
def residents_list(request):
    """Residents listing view with search and filter"""
    residents = Resident.objects.filter(is_active=True).order_by('last_name', 'first_name')
    
    # Search functionality
    search_query = request.GET.get('search')
    if search_query:
        residents = residents.filter(
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query) |
            Q(middle_name__icontains=search_query) |
            Q(contact_number__icontains=search_query)
        )
    
    # Filter by zone
    zone_filter = request.GET.get('zone')
    if zone_filter:
        residents = residents.filter(zone=zone_filter)
    
    # Filter by gender
    gender_filter = request.GET.get('gender')
    if gender_filter:
        residents = residents.filter(gender=gender_filter)
    
    # Get unique zones for filter dropdown
    zones = Resident.objects.filter(is_active=True).values_list('zone', flat=True).distinct().order_by('zone')
    
    context = {
        'residents': residents,
        'zones': zones,
        'search_query': search_query,
        'zone_filter': zone_filter,
        'gender_filter': gender_filter,
    }
    
    return render(request, 'dashboard/residents_list.html', context)


@login_required
def household_report(request):
    """Household report grouped by zone"""
    households = Household.objects.select_related('household_head').prefetch_related('members').order_by('household_number')

    grouped_households = defaultdict(list)
    total_members = 0

    for household in households:
        zone = household.household_head.zone if household.household_head and household.household_head.zone else 'Unassigned'
        member_count = household.members.count()
        total_members += member_count

        grouped_households[zone].append({
            'household': household,
            'member_count': member_count,
        })

    sorted_grouped_households = dict(sorted(grouped_households.items(), key=lambda item: item[0]))

    context = {
        'grouped_households': sorted_grouped_households,
        'total_households': households.count(),
        'total_members': total_members,
    }

    return render(request, 'dashboard/household_report.html', context)
