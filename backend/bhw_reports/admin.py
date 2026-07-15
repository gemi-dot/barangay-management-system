from django.contrib import admin
from .models import SeniorCitizenReport, SariSariStoreReport, FourPsBeneficiaryReport, PregnancyReport, HealthReport

# Register your models here.

@admin.register(SeniorCitizenReport)
class SeniorCitizenReportAdmin(admin.ModelAdmin):
    list_display = ['resident', 'pension_source', 'mobility_status', 'caregiver_name', 'last_checkup_date', 'is_active']
    list_filter = ['pension_source', 'mobility_status', 'is_active']
    search_fields = ['resident__first_name', 'resident__last_name', 'caregiver_name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('resident',)
        }),
        ('Pension Information', {
            'fields': ('pension_source', 'pension_amount')
        }),
        ('Health & Mobility', {
            'fields': ('health_conditions', 'medications', 'mobility_status', 'blood_pressure', 'blood_sugar', 'last_checkup_date')
        }),
        ('Emergency Contacts', {
            'fields': ('caregiver_name', 'caregiver_contact', 'emergency_contact', 'emergency_contact_number')
        }),
        ('Status', {
            'fields': ('is_active',)
        })
    )


@admin.register(SariSariStoreReport)
class SariSariStoreReportAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'owner', 'business_type', 'number_of_employees', 'has_proper_sanitation', 'last_inspection_date', 'is_active']
    list_filter = ['business_type', 'has_proper_sanitation', 'has_fire_safety_measures', 'is_active']
    search_fields = ['business_name', 'owner__first_name', 'owner__last_name']
    
    fieldsets = (
        ('Business Information', {
            'fields': ('owner', 'business_name', 'business_type', 'business_address', 'date_started')
        }),
        ('Legal Documents', {
            'fields': ('business_permit_number', 'dti_registration', 'bir_registration', 'food_handler_permit')
        }),
        ('Operations', {
            'fields': ('operating_hours', 'number_of_employees', 'average_daily_sales')
        }),
        ('Health & Safety', {
            'fields': ('has_proper_sanitation', 'has_fire_safety_measures', 'last_inspection_date', 'inspection_remarks')
        }),
        ('Status', {
            'fields': ('is_active',)
        })
    )


@admin.register(FourPsBeneficiaryReport)
class FourPsBeneficiaryReportAdmin(admin.ModelAdmin):
    list_display = ['beneficiary', 'household_id', 'set_of_year', 'monthly_grant_amount', 'education_compliance', 'health_compliance', 'is_active']
    list_filter = ['set_of_year', 'education_compliance', 'health_compliance', 'family_development_sessions', 'is_active']
    search_fields = ['beneficiary__first_name', 'beneficiary__last_name', 'household_id']
    
    fieldsets = (
        ('Beneficiary Information', {
            'fields': ('beneficiary', 'household_id', 'set_of_year')
        }),
        ('Household Details', {
            'fields': ('number_of_children', 'pregnant_women_count')
        }),
        ('Compliance', {
            'fields': ('education_compliance', 'health_compliance', 'family_development_sessions')
        }),
        ('Grant Information', {
            'fields': ('monthly_grant_amount', 'last_payout_date')
        }),
        ('Exit Information', {
            'fields': ('exit_date', 'exit_reason'),
            'classes': ('collapse',)
        }),
        ('Additional Notes', {
            'fields': ('remarks',)
        }),
        ('Status', {
            'fields': ('is_active',)
        })
    )


@admin.register(PregnancyReport)
class PregnancyReportAdmin(admin.ModelAdmin):
    list_display = ['pregnant_woman', 'pregnancy_number', 'expected_due_date', 'age_of_gestation_weeks', 'high_risk_pregnancy', 'pregnancy_outcome']
    list_filter = ['high_risk_pregnancy', 'pregnancy_outcome', 'is_active']
    search_fields = ['pregnant_woman__first_name', 'pregnant_woman__last_name']
    
    fieldsets = (
        ('Pregnant Woman Information', {
            'fields': ('pregnant_woman', 'pregnancy_number')
        }),
        ('Pregnancy Details', {
            'fields': ('last_menstrual_period', 'expected_due_date', 'age_of_gestation_weeks')
        }),
        ('Health Information', {
            'fields': ('pre_pregnancy_weight', 'current_weight', 'height', 'blood_pressure')
        }),
        ('Risk Assessment', {
            'fields': ('high_risk_pregnancy', 'risk_factors', 'complications')
        }),
        ('Prenatal Care', {
            'fields': ('attending_physician', 'health_facility', 'number_of_prenatal_visits', 'last_prenatal_visit', 'next_prenatal_visit')
        }),
        ('Supplements & Vaccines', {
            'fields': ('tetanus_toxoid_doses', 'iron_folate_supplements', 'calcium_supplements')
        }),
        ('Birth Preparedness', {
            'fields': ('birth_plan_ready', 'delivery_facility', 'birth_attendant')
        }),
        ('Outcome', {
            'fields': ('pregnancy_outcome', 'delivery_date', 'delivery_notes'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active',)
        })
    )
    
    def trimester(self, obj):
        return obj.trimester
    trimester.short_description = 'Trimester'


@admin.register(HealthReport)
class HealthReportAdmin(admin.ModelAdmin):
    list_display = ['resident', 'report_type', 'report_date', 'healthcare_provider', 'follow_up_needed']
    list_filter = ['report_type', 'follow_up_needed', 'report_date']
    search_fields = ['resident__first_name', 'resident__last_name', 'healthcare_provider']
    
    fieldsets = (
        ('Patient Information', {
            'fields': ('resident', 'report_type', 'report_date')
        }),
        ('Vital Signs', {
            'fields': ('temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'weight', 'height')
        }),
        ('Medical Information', {
            'fields': ('chief_complaint', 'diagnosis', 'treatment_given', 'medications_prescribed', 'recommendations')
        }),
        ('Healthcare Provider', {
            'fields': ('healthcare_provider', 'facility')
        }),
        ('Follow-up', {
            'fields': ('follow_up_needed', 'follow_up_date', 'referral_facility')
        })
    )
