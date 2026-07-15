import csv
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from residents.models import Resident


DEFAULT_DATE_OF_BIRTH = '1900-01-01'
DEFAULT_GENDER = 'M'


class Command(BaseCommand):
    help = 'Import residents from a CSV file'

    @staticmethod
    def _normalize_header(header):
        """Normalize CSV headers from Excel/Desktop exports (BOM and mojibake)."""
        if header is None:
            return ''
        cleaned = str(header).strip().replace('\ufeff', '')
        if cleaned.startswith('ï»¿'):
            cleaned = cleaned[3:]
        return cleaned

    @staticmethod
    def _is_template_metadata_row(row):
        """Skip template guide rows like "Text" and "*Required"."""
        first_name = (row.get('first_name') or '').strip()
        last_name = (row.get('last_name') or '').strip()
        date_of_birth = (row.get('date_of_birth') or '').strip()

        if first_name in {'Text', '*Required'}:
            return True
        if first_name in {'Text', '*Required'} and last_name in {'Text', '*Required'}:
            return True
        if date_of_birth in {'Date (YYYY-MM-DD)', '*Required'}:
            return True
        return False

    @staticmethod
    def _is_empty_row(row):
        return all((value is None) or (str(value).strip() == '') for value in row.values())

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file to import')
        parser.add_argument(
            '--skip-errors',
            action='store_true',
            help='Skip rows with errors instead of stopping'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        skip_errors = options['skip_errors']
        
        try:
            # utf-8-sig removes a true UTF-8 BOM when present.
            with open(csv_file, 'r', encoding='utf-8-sig', newline='') as file:
                reader = csv.DictReader(file)
                
                if not reader.fieldnames:
                    raise CommandError('CSV file is empty')

                # Some desktop exports keep BOM artifacts in header names (e.g. ï»¿first_name).
                reader.fieldnames = [self._normalize_header(name) for name in reader.fieldnames]
                
                created_count = 0
                error_count = 0
                skipped_count = 0
                
                for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                    try:
                        if self._is_empty_row(row):
                            continue

                        if self._is_template_metadata_row(row):
                            continue

                        # Prepare data with proper type conversions
                        normalized_gender = row.get('gender', DEFAULT_GENDER).strip().upper()
                        if normalized_gender not in {'M', 'F'}:
                            normalized_gender = DEFAULT_GENDER

                        normalized_dob = row.get('date_of_birth', '').strip() or DEFAULT_DATE_OF_BIRTH

                        data = {
                            'first_name': row.get('first_name', '').strip(),
                            'middle_name': row.get('middle_name', '').strip() or '',
                            'last_name': row.get('last_name', '').strip(),
                            'suffix': row.get('suffix', '').strip() or '',
                            'gender': normalized_gender,
                            'date_of_birth': normalized_dob,
                            'place_of_birth': row.get('place_of_birth', '').strip(),
                            'contact_number': row.get('contact_number', '').strip() or '',
                            'email': row.get('email', '').strip() or '',
                            'civil_status': row.get('civil_status', 'single').strip(),
                            'citizenship': row.get('citizenship', 'FILIPINO').strip() or 'FILIPINO',
                            'house_number': row.get('house_number', '').strip() or None,
                            'street': row.get('street', '').strip() or None,
                            'zone': row.get('zone', 'Purok Talisay').strip(),
                            'barangay': row.get('barangay', 'ABGAO').strip() or 'ABGAO',
                            'city_municipality': row.get('city_municipality', 'MAASIN').strip() or 'MAASIN',
                            'province': row.get('province', 'SOUTHERN LEYTE').strip() or 'SOUTHERN LEYTE',
                            'zip_code': row.get('zip_code', '6600').strip() or '6600',
                            'educational_attainment': row.get('educational_attainment', '').strip() or None,
                            'employment_status': row.get('employment_status', '').strip() or None,
                            'occupation': row.get('occupation', '').strip() or '',
                            'father_name': row.get('father_name', '').strip() or '',
                            'mother_name': row.get('mother_name', '').strip() or '',
                            'spouse_name': row.get('spouse_name', '').strip() or '',
                            'emergency_contact_name': row.get('emergency_contact_name', '').strip() or None,
                            'emergency_contact_number': row.get('emergency_contact_number', '').strip() or None,
                            'emergency_contact_relationship': row.get('emergency_contact_relationship', '').strip() or None,
                            'voters_id': row.get('voters_id', '').strip() or '',
                            'philhealth_number': row.get('philhealth_number', '').strip() or '',
                            'sss_gsis_number': row.get('sss_gsis_number', '').strip() or '',
                            'tin_number': row.get('tin_number', '').strip() or '',
                            'precinct_number': row.get('precinct_number', '').strip() or '',
                            'pwd_type': row.get('pwd_type', '').strip() or '',
                            'blood_type': row.get('blood_type', '').strip() or '',
                            'allergies': row.get('allergies', '').strip() or '',
                            'medical_conditions': row.get('medical_conditions', '').strip() or '',
                        }
                        
                        # Handle monthly_income conversion
                        try:
                            monthly_income = row.get('monthly_income', '').strip()
                            data['monthly_income'] = float(monthly_income) if monthly_income else None
                        except ValueError:
                            data['monthly_income'] = None
                        
                        # Handle boolean fields
                        for bool_field in ['is_pwd', 'is_senior_citizen', 'is_solo_parent', 'is_indigenous', 'is_4ps_beneficiary']:
                            bool_val = row.get(bool_field, 'false').strip().lower()
                            data[bool_field] = bool_val in ['true', '1', 'yes']
                        
                        # Validate required fields
                        if not data['first_name']:
                            raise ValueError('first_name is required')
                        if not data['last_name']:
                            raise ValueError('last_name is required')
                        
                        # Create resident
                        resident = Resident.objects.create(**data)
                        created_count += 1
                        
                    except Exception as e:
                        error_count += 1
                        error_msg = f"Row {row_num}: {str(e)}"
                        
                        if skip_errors:
                            self.stdout.write(self.style.WARNING(f'SKIPPED - {error_msg}'))
                            skipped_count += 1
                        else:
                            raise CommandError(error_msg)
                
                # Print summary
                self.stdout.write(self.style.SUCCESS(f'\n✓ Successfully imported {created_count} residents'))
                if skipped_count > 0:
                    self.stdout.write(self.style.WARNING(f'⚠ Skipped {skipped_count} rows due to errors'))
                if error_count > 0 and not skip_errors:
                    self.stdout.write(self.style.ERROR(f'✗ {error_count} error(s) encountered'))
                    
        except FileNotFoundError:
            raise CommandError(f'CSV file not found: {csv_file}')
        except Exception as e:
            raise CommandError(f'Error reading CSV file: {str(e)}')
