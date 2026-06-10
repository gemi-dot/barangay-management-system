from django.contrib import admin
from django.template.response import TemplateResponse
from django.urls import path, reverse

from .models import Resident, Household, Precinct, DocumentRequest, BarangayOfficeProfile

# Register your models here.

@admin.register(Resident)
class ResidentAdmin(admin.ModelAdmin):
    list_display = ['voters_id', 'precinct_number', 'portal_user', 'philhealth_number', 'sss_gsis_number', 'tin_number', 'last_name', 'first_name', 'middle_name', 'age', 'gender', 'zone', 'is_senior_citizen', 'is_4ps_beneficiary', 'is_active']
    list_filter = ['gender', 'civil_status', 'is_senior_citizen', 'is_4ps_beneficiary', 'is_pwd', 'zone', 'is_active']
    search_fields = ['first_name', 'last_name', 'middle_name', 'contact_number']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('first_name', 'middle_name', 'last_name', 'suffix', 'date_of_birth', 'place_of_birth', 'gender', 'civil_status', 'citizenship')
        }),
        ('Contact Information', {
            'fields': ('contact_number', 'email')
        }),
        ('Address Information', {
            'fields': ('house_number', 'street', 'zone', 'barangay', 'city_municipality', 'province', 'zip_code')
        }),
        ('Educational & Employment', {
            'fields': ('educational_attainment', 'employment_status', 'occupation', 'monthly_income')
        }),
        ('Family Information', {
            'fields': ('father_name', 'mother_name', 'spouse_name', 'emergency_contact_name', 'emergency_contact_number', 'emergency_contact_relationship')
        }),
        ('Government IDs', {
            'fields': ('philhealth_number', 'sss_gsis_number', 'tin_number', 'voters_id', 'precinct', 'precinct_number')
        }),
        ('Special Categories', {
            'fields': ('is_pwd', 'pwd_type', 'is_senior_citizen', 'is_solo_parent', 'is_indigenous', 'is_4ps_beneficiary')
        }),
        ('Health Information', {
            'fields': ('blood_type', 'allergies', 'medical_conditions')
        }),
        ('System Information', {
            'fields': ('is_active', 'date_registered'),
            'classes': ('collapse',)
        })
    )
    
    def age(self, obj):
        return obj.age
    age.short_description = 'Age'


@admin.register(Household)
class HouseholdAdmin(admin.ModelAdmin):
    list_display = ['household_number', 'household_head', 'house_ownership', 'total_monthly_income', 'created_at']
    list_filter = ['house_ownership']
    search_fields = ['household_number', 'household_head__first_name', 'household_head__last_name']
    
    filter_horizontal = ['members']


@admin.register(Precinct)
class PrecinctAdmin(admin.ModelAdmin):
    list_display = ['precinct_number', 'precinct_name', 'location', 'capacity', 'registered_voters_count', 'precinct_chairman', 'is_active']
    list_filter = ['is_active']
    search_fields = ['precinct_number', 'precinct_name', 'location', 'precinct_chairman']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Precinct Information', {
            'fields': ('precinct_number', 'precinct_name', 'location', 'capacity')
        }),
        ('Officials', {
            'fields': ('precinct_chairman', 'poll_clerk')
        }),
        ('Contact Information', {
            'fields': ('contact_number',)
        }),
        ('Status', {
            'fields': ('is_active',)
        })
    )
    
    def registered_voters_count(self, obj):
        return obj.registered_voters_count
    registered_voters_count.short_description = 'Registered Voters'


@admin.register(DocumentRequest)
class DocumentRequestAdmin(admin.ModelAdmin):
    change_list_template = 'admin/residents/documentrequest/change_list.html'
    list_display = [
        'tracking_number',
        'full_name',
        'submitted_by',
        'document_type',
        'status',
        'preferred_release_date',
        'processed_by',
        'created_at',
    ]
    list_filter = ['status', 'document_type', 'created_at']
    search_fields = ['tracking_number', 'full_name', 'contact_number', 'email', 'submitted_by__username', 'submitted_by__email']
    readonly_fields = ['tracking_number', 'created_at', 'updated_at']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'unlinked-identity-report/',
                self.admin_site.admin_view(self.unlinked_identity_report),
                name='residents_documentrequest_unlinked_identity_report',
            ),
        ]
        return custom_urls + urls

    def unlinked_identity_report(self, request):
        unlinked_residents = Resident.objects.filter(portal_user__isnull=True).order_by('last_name', 'first_name')
        unlinked_requests = DocumentRequest.objects.filter(submitted_by__isnull=True).order_by('-created_at')

        context = {
            **self.admin_site.each_context(request),
            'title': 'Unlinked Identity Report',
            'unlinked_residents': unlinked_residents,
            'unlinked_requests': unlinked_requests,
            'resident_count': unlinked_residents.count(),
            'request_count': unlinked_requests.count(),
        }
        return TemplateResponse(request, 'admin/residents/documentrequest/unlinked_identity_report.html', context)


@admin.register(BarangayOfficeProfile)
class BarangayOfficeProfileAdmin(admin.ModelAdmin):
    list_display = [
        'office_name',
        'barangay',
        'city_municipality',
        'province',
        'captain_name',
        'default_or_number',
        'default_control_number',
        'updated_at',
    ]

    def has_add_permission(self, request):
        # Keep only one profile record for system-wide certificate defaults.
        if BarangayOfficeProfile.objects.exists():
            return False
        return super().has_add_permission(request)
