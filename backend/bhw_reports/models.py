from django.db import models
from django.utils import timezone
from residents.models import Resident

# Create your models here.

class SeniorCitizenReport(models.Model):
    """Track senior citizens in the barangay"""
    resident = models.OneToOneField(Resident, on_delete=models.CASCADE, related_name='senior_citizen_report')
    pension_source = models.CharField(max_length=100, blank=True, choices=[
        ('sss', 'SSS'),
        ('gsis', 'GSIS'),
        ('private', 'Private'),
        ('none', 'No Pension'),
        ('other', 'Other'),
    ])
    pension_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    health_conditions = models.TextField(blank=True, verbose_name="Known Health Conditions")
    medications = models.TextField(blank=True, verbose_name="Current Medications")
    mobility_status = models.CharField(max_length=50, choices=[
        ('independent', 'Independent'),
        ('assisted', 'Needs Assistance'),
        ('wheelchair', 'Wheelchair Bound'),
        ('bedridden', 'Bedridden'),
    ], default='independent')
    caregiver_name = models.CharField(max_length=150, blank=True)
    caregiver_contact = models.CharField(max_length=15, blank=True)
    emergency_contact = models.CharField(max_length=150, blank=True)
    emergency_contact_number = models.CharField(max_length=15, blank=True)
    
    # Health monitoring
    last_checkup_date = models.DateField(blank=True, null=True)
    blood_pressure = models.CharField(max_length=20, blank=True)
    blood_sugar = models.CharField(max_length=20, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Senior Citizen Report'
        verbose_name_plural = 'Senior Citizens Reports'
    
    def __str__(self):
        return f"Senior Citizen: {self.resident.full_name}"


class SariSariStoreReport(models.Model):
    """Track sari-sari stores and carenderias in the barangay"""
    BUSINESS_TYPE_CHOICES = [
        ('sari_sari', 'Sari-Sari Store'),
        ('carenderia', 'Carenderia'),
        ('both', 'Both'),
        ('other', 'Other Food Business'),
    ]
    
    owner = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='businesses')
    business_name = models.CharField(max_length=200)
    business_type = models.CharField(max_length=20, choices=BUSINESS_TYPE_CHOICES)
    business_address = models.TextField()
    
    # Business details
    business_permit_number = models.CharField(max_length=50, blank=True)
    dti_registration = models.CharField(max_length=50, blank=True)
    bir_registration = models.CharField(max_length=50, blank=True)
    food_handler_permit = models.CharField(max_length=50, blank=True)
    
    # Operating details
    operating_hours = models.CharField(max_length=100, blank=True)
    number_of_employees = models.PositiveIntegerField(default=0)
    average_daily_sales = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # Health and safety
    has_proper_sanitation = models.BooleanField(default=False)
    has_fire_safety_measures = models.BooleanField(default=False)
    last_inspection_date = models.DateField(blank=True, null=True)
    inspection_remarks = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    date_started = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Sari-Sari Store/Carenderia Report'
        verbose_name_plural = 'Sari-Sari Stores/Carenderias Reports'
    
    def __str__(self):
        return f"{self.business_name} - {self.owner.full_name}"


class FourPsBeneficiaryReport(models.Model):
    """Track 4Ps beneficiaries in the barangay"""
    beneficiary = models.OneToOneField(Resident, on_delete=models.CASCADE, related_name='fourps_report')
    household_id = models.CharField(max_length=50, unique=True, verbose_name="4Ps Household ID")
    set_of_year = models.IntegerField(verbose_name="Set of Year")
    
    # Conditions and Compliance
    education_compliance = models.BooleanField(default=True, verbose_name="Education Condition Compliance")
    health_compliance = models.BooleanField(default=True, verbose_name="Health Condition Compliance")
    family_development_sessions = models.BooleanField(default=True, verbose_name="Family Development Sessions Attendance")
    
    # Beneficiary details
    number_of_children = models.PositiveIntegerField(default=0)
    pregnant_women_count = models.PositiveIntegerField(default=0, verbose_name="Number of Pregnant Women in Household")
    
    # Grant details
    monthly_grant_amount = models.DecimalField(max_digits=10, decimal_places=2)
    last_payout_date = models.DateField(blank=True, null=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    exit_date = models.DateField(blank=True, null=True)
    exit_reason = models.CharField(max_length=100, blank=True)
    
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '4Ps Beneficiary Report'
        verbose_name_plural = '4Ps Beneficiaries Reports'
    
    def __str__(self):
        return f"4Ps: {self.beneficiary.full_name} - {self.household_id}"


class PregnancyReport(models.Model):
    """Track pregnant women in the barangay"""
    pregnant_woman = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='pregnancy_reports')
    pregnancy_number = models.PositiveIntegerField(verbose_name="Pregnancy Number (G)")
    
    # Pregnancy details
    last_menstrual_period = models.DateField(verbose_name="Last Menstrual Period (LMP)")
    expected_due_date = models.DateField(verbose_name="Expected Date of Delivery (EDD)")
    age_of_gestation_weeks = models.PositiveIntegerField(blank=True, null=True, verbose_name="Age of Gestation (weeks)")
    
    # Health information
    pre_pregnancy_weight = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    current_weight = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    blood_pressure = models.CharField(max_length=20, blank=True)
    
    # Risk factors
    high_risk_pregnancy = models.BooleanField(default=False)
    risk_factors = models.TextField(blank=True)
    complications = models.TextField(blank=True)
    
    # Prenatal care
    attending_physician = models.CharField(max_length=150, blank=True)
    health_facility = models.CharField(max_length=200, blank=True)
    number_of_prenatal_visits = models.PositiveIntegerField(default=0)
    last_prenatal_visit = models.DateField(blank=True, null=True)
    next_prenatal_visit = models.DateField(blank=True, null=True)
    
    # Vaccinations and supplements
    tetanus_toxoid_doses = models.PositiveIntegerField(default=0)
    iron_folate_supplements = models.BooleanField(default=False)
    calcium_supplements = models.BooleanField(default=False)
    
    # Birth preparedness
    birth_plan_ready = models.BooleanField(default=False)
    delivery_facility = models.CharField(max_length=200, blank=True, verbose_name="Planned Delivery Facility")
    birth_attendant = models.CharField(max_length=150, blank=True)
    
    # Outcome (if applicable)
    pregnancy_outcome = models.CharField(max_length=50, choices=[
        ('ongoing', 'Ongoing'),
        ('live_birth', 'Live Birth'),
        ('stillbirth', 'Stillbirth'),
        ('miscarriage', 'Miscarriage'),
        ('abortion', 'Abortion'),
    ], default='ongoing')
    delivery_date = models.DateField(blank=True, null=True)
    delivery_notes = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Pregnancy Report'
        verbose_name_plural = 'Pregnancy Reports'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Pregnancy: {self.pregnant_woman.full_name} - EDD: {self.expected_due_date}"
    
    @property
    def trimester(self):
        if self.age_of_gestation_weeks:
            if self.age_of_gestation_weeks <= 12:
                return "1st Trimester"
            elif self.age_of_gestation_weeks <= 28:
                return "2nd Trimester"
            else:
                return "3rd Trimester"
        return "Unknown"


class HealthReport(models.Model):
    """General health reports and monitoring"""
    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='health_reports')
    report_type = models.CharField(max_length=50, choices=[
        ('routine_checkup', 'Routine Checkup'),
        ('immunization', 'Immunization'),
        ('illness', 'Illness Report'),
        ('injury', 'Injury Report'),
        ('follow_up', 'Follow-up'),
        ('referral', 'Referral'),
    ])
    
    # Basic vital signs
    temperature = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    blood_pressure_systolic = models.PositiveIntegerField(blank=True, null=True)
    blood_pressure_diastolic = models.PositiveIntegerField(blank=True, null=True)
    heart_rate = models.PositiveIntegerField(blank=True, null=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    
    # Report details
    chief_complaint = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    treatment_given = models.TextField(blank=True)
    medications_prescribed = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    
    # Healthcare provider
    healthcare_provider = models.CharField(max_length=150)
    facility = models.CharField(max_length=200, blank=True)
    
    # Follow-up
    follow_up_needed = models.BooleanField(default=False)
    follow_up_date = models.DateField(blank=True, null=True)
    referral_facility = models.CharField(max_length=200, blank=True)
    
    report_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Health Report'
        verbose_name_plural = 'Health Reports'
        ordering = ['-report_date']
    
    def __str__(self):
        return f"Health Report: {self.resident.full_name} - {self.report_date}"
