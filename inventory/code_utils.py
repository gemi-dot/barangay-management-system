import re

from .models import Asset

def generate_next_asset_code(category_value=None, year=None):
    prefix = 'LA-'
    pattern = re.compile(r'^LA-(\d{4})$')

    max_sequence = 0
    existing_codes = Asset.objects.filter(property_number__startswith=prefix).values_list('property_number', flat=True)
    for code in existing_codes:
        match = pattern.match(code)
        if not match:
            continue
        sequence = int(match.group(1))
        if sequence > max_sequence:
            max_sequence = sequence

    return f'{prefix}{max_sequence + 1:04d}'
