from django import forms
from .models import Resident, DocumentRequest

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
