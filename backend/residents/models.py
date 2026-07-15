from django.conf import settings
from django.db import models
from django.db import IntegrityError
from django.core.validators import RegexValidator
from django.core.files.base import ContentFile
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from urllib.parse import urljoin
from io import BytesIO
import uuid
import qrcode

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
    date_of_birth = models.DateField(default='1900-01-01', blank=True)
    place_of_birth = models.CharField(max_length=100, default='UNKNOWN', blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='M', blank=True)
    civil_status = models.CharField(max_length=20, choices=CIVIL_STATUS_CHOICES, default='single', blank=True)
    citizenship = models.CharField(max_length=50, default='FILIPINO', blank=True)
    
    # Address Information
    house_number = models.CharField(max_length=20, blank=True, null=True)
    street = models.CharField(max_length=100, blank=True, null=True)
    zone = models.CharField(max_length=50, choices=ZONE_CHOICES, default='Purok Talisay', blank=True)
    barangay = models.CharField(max_length=100, default='ABGAO', blank=True)
    city_municipality = models.CharField(max_length=100, default='MAASIN', blank=True)
    province = models.CharField(max_length=100, default='SOUTHERN LEYTE', blank=True)
    zip_code = models.CharField(max_length=10, default='6600', blank=True)
    
    # Educational and Employment Information
    educational_attainment = models.CharField(max_length=20, choices=EDUCATIONAL_ATTAINMENT_CHOICES, blank=True, null=True)
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS_CHOICES, blank=True, null=True)
    occupation = models.CharField(max_length=100, blank=True)
    monthly_income = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # Family Information
    father_name = models.CharField(max_length=150, blank=True)
    mother_name = models.CharField(max_length=150, blank=True)
    spouse_name = models.CharField(max_length=150, blank=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True, null=True, default='N/A')
    emergency_contact_number = models.CharField(max_length=15, blank=True, null=True, default='N/A')
    emergency_contact_relationship = models.CharField(max_length=50, blank=True, null=True, default='N/A')
    
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
    qr_code = models.CharField(max_length=16, unique=True, editable=False, blank=True)
    qr_image = models.ImageField(upload_to='resident_qr_codes/', blank=True, null=True, editable=False)
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

    def save(self, *args, **kwargs):
        # Keep emergency contact fields readable in admin/list views.
        if not self.emergency_contact_name:
            self.emergency_contact_name = 'N/A'
        if not self.emergency_contact_number:
            self.emergency_contact_number = 'N/A'
        if not self.emergency_contact_relationship:
            self.emergency_contact_relationship = 'N/A'

        self._ensure_qr_code()

        update_fields = kwargs.get('update_fields')
        if update_fields is not None and 'qr_code' not in update_fields:
            kwargs['update_fields'] = list(set(update_fields) | {'qr_code'})

        super().save(*args, **kwargs)

        if not self.qr_image:
            self._generate_qr_image()
            type(self).objects.filter(pk=self.pk).update(qr_image=self.qr_image.name)

    def _ensure_qr_code(self):
        if self.qr_code:
            return

        for _ in range(10):
            code = uuid.uuid4().hex[:16].upper()
            if not type(self).objects.filter(qr_code=code).exists():
                self.qr_code = code
                return

        raise IntegrityError('Could not generate a unique QR code for resident.')

    def _qr_payload(self):
        scan_path = reverse('residents:scan_resident_qr', args=[self.qr_code])
        base_url = getattr(settings, 'SITE_BASE_URL', '').strip()

        if base_url:
            return urljoin(f"{base_url.rstrip('/')}/", scan_path.lstrip('/'))

        return f"BRGY-RESIDENT:{self.qr_code}"

    def _generate_qr_image(self):
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2,
        )
        qr.add_data(self._qr_payload())
        qr.make(fit=True)

        image = qr.make_image(fill_color='black', back_color='white')
        image_io = BytesIO()
        image.save(image_io, format='PNG')

        filename = f"resident_{self.qr_code}.png"
        self.qr_image.save(filename, ContentFile(image_io.getvalue()), save=False)
    
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


class ResidentServiceLog(models.Model):
    ACTION_SCANNED_QR = 'scanned_qr'
    ACTION_VISITED_TODAY = 'visited_today'

    ACTION_CHOICES = [
        (ACTION_SCANNED_QR, 'Scanned QR'),
        (ACTION_VISITED_TODAY, 'Visited Today'),
    ]

    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='service_logs')
    logged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resident_service_logs',
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES, default=ACTION_VISITED_TODAY)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Resident Service Log'
        verbose_name_plural = 'Resident Service Logs'

    def __str__(self):
        return f"{self.resident.full_name} - {self.get_action_display()} ({self.created_at:%Y-%m-%d %H:%M})"


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

    @classmethod
    def _next_tracking_number(cls):
        today = timezone.localdate()
        prefix = f"DR-{today:%Y%m%d}"
        latest_today = (
            cls.objects.filter(tracking_number__startswith=f"{prefix}-")
            .order_by('-tracking_number')
            .values_list('tracking_number', flat=True)
            .first()
        )

        if latest_today:
            try:
                next_sequence = int(latest_today.rsplit('-', 1)[-1]) + 1
            except ValueError:
                next_sequence = 1
        else:
            next_sequence = 1

        return f"{prefix}-{next_sequence:03d}"

    def save(self, *args, **kwargs):
        if self.tracking_number:
            return super().save(*args, **kwargs)

        # Retry a few times in case two requests are saved at nearly the same time.
        for _ in range(5):
            self.tracking_number = self._next_tracking_number()
            try:
                return super().save(*args, **kwargs)
            except IntegrityError as exc:
                if 'tracking_number' not in str(exc):
                    raise

        raise IntegrityError('Unable to generate a unique tracking number after multiple attempts.')


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
