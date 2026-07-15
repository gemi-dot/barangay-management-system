from django import forms

from .code_utils import generate_next_asset_code
from .models import Asset


class AssetCreateForm(forms.ModelForm):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)

		self.fields['property_number'].required = False
		self.fields['property_number'].widget.attrs.update(
			{
				'placeholder': 'Leave blank for auto (LA-0001) or type existing code (e.g., ABG-...)',
			}
		)

	def clean(self):
		cleaned_data = super().clean()
		category = cleaned_data.get('category')
		property_number = (cleaned_data.get('property_number') or '').strip().upper()

		if property_number:
			cleaned_data['property_number'] = property_number
			return cleaned_data

		if category:
			try:
				cleaned_data['property_number'] = generate_next_asset_code(category.name)
			except ValueError as exc:
				self.add_error('category', str(exc))

		return cleaned_data

	class Meta:
		model = Asset
		fields = [
			'property_number',
			'category',
			'description',
			'serial_number',
			'brand_model',
			'date_acquired',
			'cost',
			'funding_source',
			'supplier',
			'useful_life_years',
			'condition',
			'location',
			'responsible_person',
			'responsible_role',
			'accountability_status',
			'next_inspection_date',
			'status',
			'last_inventory_date',
			'notes',
		]
		widgets = {
			'property_number': forms.TextInput(attrs={'class': 'form-control'}),
			'category': forms.Select(attrs={'class': 'form-select'}),
			'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
			'serial_number': forms.TextInput(attrs={'class': 'form-control'}),
			'brand_model': forms.TextInput(attrs={'class': 'form-control'}),
			'date_acquired': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
			'cost': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
			'funding_source': forms.Select(attrs={'class': 'form-select'}),
			'supplier': forms.TextInput(attrs={'class': 'form-control'}),
			'useful_life_years': forms.NumberInput(attrs={'class': 'form-control'}),
			'condition': forms.Select(attrs={'class': 'form-select'}),
			'location': forms.Select(attrs={'class': 'form-select'}),
			'responsible_person': forms.Select(attrs={'class': 'form-select'}),
			'responsible_role': forms.Select(attrs={'class': 'form-select'}),
			'accountability_status': forms.Select(attrs={'class': 'form-select'}),
			'next_inspection_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
			'status': forms.Select(attrs={'class': 'form-select'}),
			'last_inventory_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
			'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
		}


class AssetUpdateForm(forms.ModelForm):
	class Meta:
		model = Asset
		fields = [
			'condition',
			'status',
			'location',
			'responsible_person',
			'responsible_role',
			'accountability_status',
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
			'accountability_status': forms.Select(attrs={'class': 'form-select'}),
			'next_inspection_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
			'last_inventory_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
			'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
		}