from django.contrib import admin
from .models import Resident, Household, Precinct

# Register your models here.

@admin.register(Resident)
class ResidentAdmin(admin.ModelAdmin):
    list_display = ['voters_id', 'precinct_number', 'philhealth_number', 'sss_gsis_number', 'tin_number', 'last_name', 'first_name', 'middle_name', 'age', 'gender', 'zone', 'is_senior_citizen', 'is_4ps_beneficiary', 'is_active']
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
