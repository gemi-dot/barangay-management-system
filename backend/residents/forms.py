from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm
from .models import Resident, DocumentRequest

User = get_user_model()

class ResidentForm(forms.ModelForm):
    class Meta:
        model = Resident
        fields = [
            'philhealth_number',
            'sss_gsis_number',
            'tin_number',
            'voters_id',
            'precinct_number',
        ]
        widgets = {
            'philhealth_number': forms.TextInput(attrs={'class': 'form-control'}),
            'sss_gsis_number': forms.TextInput(attrs={'class': 'form-control'}),
            'tin_number': forms.TextInput(attrs={'class': 'form-control'}),
            'voters_id': forms.TextInput(attrs={'class': 'form-control'}),
            'precinct_number': forms.TextInput(attrs={'class': 'form-control'}),
        }


class DocumentRequestForm(forms.ModelForm):
    class Meta:
        model = DocumentRequest
        fields = [
            'full_name',
            'contact_number',
            'email',
            'address',
            'document_type',
            'purpose',
            'preferred_release_date',
        ]
        widgets = {
            'full_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Juan Dela Cruz'}),
            'contact_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '09XXXXXXXXX'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'name@example.com'}),
            'address': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'House No., Street, Purok, Barangay'}),
            'document_type': forms.Select(attrs={'class': 'form-select'}),
            'purpose': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'State why you need this document'}),
            'preferred_release_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }


class ResidentRegistrationForm(UserCreationForm):
    first_name = forms.CharField(max_length=150, widget=forms.TextInput(attrs={'class': 'form-control'}))
    last_name = forms.CharField(max_length=150, widget=forms.TextInput(attrs={'class': 'form-control'}))
    email = forms.EmailField(widget=forms.EmailInput(attrs={'class': 'form-control'}))

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'password1', 'password2']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
        }

    def clean_email(self):
        email = self.cleaned_data['email'].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError('This email is already registered.')
        return email


class ResidentProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.get('instance')
        super().__init__(*args, **kwargs)

    def clean_email(self):
        email = self.cleaned_data['email'].strip().lower()
        qs = User.objects.filter(email__iexact=email)
        if self.user:
            qs = qs.exclude(pk=self.user.pk)
        if qs.exists():
            raise forms.ValidationError('This email is already used by another account.')
        return email
