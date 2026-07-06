from django import forms

from .models import Asset


class AssetUpdateForm(forms.ModelForm):
	class Meta:
		model = Asset
		fields = [
			'condition',
			'status',
			'location',
			'responsible_person',
			'responsible_role',
			'next_inspection_date',
			'last_inventory_date',
			'notes',
		]
		widgets = {
			'condition': forms.Select(attrs={'class': 'form-select'}),
			'status': forms.Select(attrs={'class': 'form-select'}),
			'location': forms.Select(attrs={'class': 'form-select'}),
			'responsible_person': forms.Select(attrs={'class': 'form-select'}),
			'responsible_role': forms.Select(attrs={'class': 'form-select'}),
			'next_inspection_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
			'last_inventory_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
			'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
		}