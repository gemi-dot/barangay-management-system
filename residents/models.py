from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone

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
    citizenship = models.CharField(max_length=50, default='Filipino')
    
    # Address Information
    house_number = models.CharField(max_length=20)
    street = models.CharField(max_length=100)
    zone = models.CharField(max_length=50)
    barangay = models.CharField(max_length=100, default='Your Barangay Name')
    city_municipality = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=10)
    
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
        return f"{self.house_number} {self.street}, Zone {self.zone}, {self.barangay}, {self.city_municipality}, {self.province} {self.zip_code}"


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
