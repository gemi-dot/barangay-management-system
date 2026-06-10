from django.conf import settings
from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
from django.contrib.auth import get_user_model

# Create your models here.

class Precinct(models.Model):
    """Model to manage voting precincts in the barangay"""
    precinct_number = models.CharField(max_length=20, unique=True)
    precinct_name = models.CharField(max_length=100, blank=True)
    location = models.TextField(blank=True, help_text="Physical location/address of the precinct")
    capacity = models.PositiveIntegerField(default=0, help_text="Maximum number of registered voters")
    
    # Officials
    precinct_chairman = models.CharField(max_length=150, blank=True)
    poll_clerk = models.CharField(max_length=150, blank=True)
    
    # Contact info
    contact_number = models.CharField(max_length=15, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['precinct_number']
        verbose_name = 'Precinct'
        verbose_name_plural = 'Precincts'
    
    def __str__(self):
        return f"Precinct {self.precinct_number}"
    
    @property
    def registered_voters_count(self):
        return self.residents.filter(voters_id__isnull=False, is_active=True).count()


class Resident(models.Model):
    CIVIL_STATUS_CHOICES = [
        ('single', 'Single'),
        ('married', 'Married'),
        ('widowed', 'Widowed'),
        ('separated', 'Separated'),
        ('divorced', 'Divorced'),
    ]
    
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]
    
    EDUCATIONAL_ATTAINMENT_CHOICES = [
        ('no_formal', 'No Formal Education'),
        ('elementary', 'Elementary'),
        ('high_school', 'High School'),
        ('vocational', 'Vocational'),
        ('college', 'College'),
        ('post_graduate', 'Post Graduate'),
    ]
    
    EMPLOYMENT_STATUS_CHOICES = [
        ('employed', 'Employed'),
        ('unemployed', 'Unemployed'),
        ('student', 'Student'),
        ('retired', 'Retired'),
        ('self_employed', 'Self Employed'),
        ('ofw', 'OFW'),
    ]

    ZONE_CHOICES = [
        ('Purok Talisay', 'Purok Talisay'),
        ('Purok Malunggay', 'Purok Malunggay'),
        ('Purok Mancinitas', 'Purok Mancinitas'),
        ('Purok Narra', 'Purok Narra'),
        ('Purok Kulo', 'Purok Kulo'),
        ('Purok Ipil-ipil', 'Purok Ipil-ipil'),
        ('Purok Tugas', 'Purok Tugas'),
    ]
    
    # Personal Information
    first_name = models.CharField(max_length=50)
    middle_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50)
    suffix = models.CharField(max_length=10, blank=True)
    
    # Contact Information
    contact_number = models.CharField(
        max_length=15,
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$', message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed.")],
        blank=True
    )
    email = models.EmailField(blank=True)
    
    # Basic Information
    date_of_birth = models.DateField()
    place_of_birth = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    civil_status = models.CharField(max_length=20, choices=CIVIL_STATUS_CHOICES)
    citizenship = models.CharField(max_length=50, default='FILIPINO')
    
    # Address Information
    house_number = models.CharField(max_length=20)
    street = models.CharField(max_length=100)
    zone = models.CharField(max_length=50, choices=ZONE_CHOICES)
    barangay = models.CharField(max_length=100, default='ABGAO')
    city_municipality = models.CharField(max_length=100, default='MAASIN')
    province = models.CharField(max_length=100, default='SOUTHERN LEYTE')
    zip_code = models.CharField(max_length=10, default='6600')
    
    # Educational and Employment Information
    educational_attainment = models.CharField(max_length=20, choices=EDUCATIONAL_ATTAINMENT_CHOICES)
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS_CHOICES)
    occupation = models.CharField(max_length=100, blank=True)
    monthly_income = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # Family Information
    father_name = models.CharField(max_length=150, blank=True)
    mother_name = models.CharField(max_length=150, blank=True)
    spouse_name = models.CharField(max_length=150, blank=True)
    emergency_contact_name = models.CharField(max_length=150)
    emergency_contact_number = models.CharField(max_length=15)
    emergency_contact_relationship = models.CharField(max_length=50)
    
    # Government IDs and Numbers
    philhealth_number = models.CharField(max_length=20, blank=True)
    sss_gsis_number = models.CharField(max_length=20, blank=True)
    tin_number = models.CharField(max_length=20, blank=True)
    voters_id = models.CharField(max_length=20, blank=True)
    precinct = models.ForeignKey(Precinct, on_delete=models.SET_NULL, null=True, blank=True, related_name='residents')
    precinct_number = models.CharField(max_length=20, blank=True)  # Keep for backward compatibility
    
    # Health and Special Categories
    is_pwd = models.BooleanField(default=False, verbose_name="Person with Disability")
    pwd_type = models.CharField(max_length=100, blank=True, verbose_name="PWD Type")
    is_senior_citizen = models.BooleanField(default=False)
    is_solo_parent = models.BooleanField(default=False)
    is_indigenous = models.BooleanField(default=False, verbose_name="Indigenous Person")
    is_4ps_beneficiary = models.BooleanField(default=False, verbose_name="4Ps Beneficiary")
    
    # Health Information
    blood_type = models.CharField(max_length=5, blank=True)
    allergies = models.TextField(blank=True)
    medical_conditions = models.TextField(blank=True)
    
    # System Fields
    portal_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resident_profile',
    )
    date_registered = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['last_name', 'first_name']
        verbose_name = 'Resident'
        verbose_name_plural = 'Residents'
    
    def __str__(self):
        return f"{self.last_name}, {self.first_name} {self.middle_name}"
    
    @property
    def full_name(self):
        middle = f" {self.middle_name}" if self.middle_name else ""
        suffix = f" {self.suffix}" if self.suffix else ""
        return f"{self.first_name}{middle} {self.last_name}{suffix}"
    
    @property
    def age(self):
        today = timezone.now().date()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
    
    @property
    def complete_address(self):
        return f"{self.house_number} {self.street}, Purok {self.zone}, {self.barangay}, {self.city_municipality}, {self.province} {self.zip_code}"


class Household(models.Model):
    """Model to group residents by household/family"""
    household_head = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='headed_household')
    household_number = models.CharField(max_length=20, unique=True)
    members = models.ManyToManyField(Resident, related_name='households', blank=True)
    total_monthly_income = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    house_ownership = models.CharField(max_length=50, choices=[
        ('owned', 'Owned'),
        ('rented', 'Rented'),
        ('shared', 'Shared'),
        ('caretaker', 'Caretaker'),
    ], default='owned')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['household_number']
        verbose_name = 'Household'
        verbose_name_plural = 'Households'
    
    def __str__(self):
        return f"Household {self.household_number} - {self.household_head.full_name}"


class DocumentRequest(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('barangay_clearance', 'Barangay Clearance'),
        ('certificate_of_residency', 'Certificate of Residency'),
        ('certificate_of_indigency', 'Certificate of Indigency'),
        ('business_clearance', 'Business Clearance'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('ready_for_pickup', 'Ready for Pickup'),
        ('released', 'Released'),
        ('rejected', 'Rejected'),
    ]

    tracking_number = models.CharField(max_length=20, unique=True, editable=False)
    full_name = models.CharField(max_length=150)
    contact_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resident_document_requests',
    )
    address = models.CharField(max_length=255)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPE_CHOICES)
    purpose = models.TextField()
    preferred_release_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    remarks = models.TextField(blank=True)
    processed_by = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_document_requests'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tracking_number} - {self.full_name}"

    def save(self, *args, **kwargs):
        if not self.tracking_number:
            today = timezone.localdate()
            prefix = f"DR-{today:%Y%m%d}"
            count_today = DocumentRequest.objects.filter(
                created_at__date=today
            ).count() + 1
            self.tracking_number = f"{prefix}-{count_today:03d}"
        super().save(*args, **kwargs)


class BarangayOfficeProfile(models.Model):
    office_name = models.CharField(max_length=150, default='Barangay Abgao')
    barangay = models.CharField(max_length=100, default='ABGAO')
    city_municipality = models.CharField(max_length=100, default='MAASIN')
    province = models.CharField(max_length=100, default='SOUTHERN LEYTE')
    captain_name = models.CharField(max_length=150, default='HON. BARANGAY CAPTAIN')
    default_or_number = models.CharField(max_length=50, blank=True)
    default_control_number = models.CharField(max_length=50, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Barangay Office Profile'
        verbose_name_plural = 'Barangay Office Profile'

    def __str__(self):
        return self.office_name

    @classmethod
    def get_solo(cls):
        profile = cls.objects.order_by('id').first()
        if profile:
            return profile
        return cls.objects.create()
