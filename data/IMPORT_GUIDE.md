# Residents CSV Import Guide

## Overview
This guide explains how to import resident data from CSV/Excel files into the Barangay IMS database.

## Files Included
- **`residents_import_template.csv`** - Template file with all required fields and example data
- **`residents_import_template.xlsx`** - Excel template (RECOMMENDED) with formatted headers, sample data, and reference guide

## Quick Start

### Step 1: Prepare Your Data
1. Open `residents_import_template.xlsx` (Excel - RECOMMENDED) or `.csv` in Excel/Google Sheets
2. Replace the example data with your resident information
3. Add more rows as needed
4. Save the file in its original format (Excel or CSV)

### Step 2: Run the Import Command
#### For Excel Files (.xlsx) - RECOMMENDED ⭐
```bash
source venv/bin/activate
python manage.py import_residents_excel data/your_file.xlsx
```

#### For CSV Files
```bash
source venv/bin/activate
python manage.py import_residents_csv data/your_file.csv
```

Note: Direct Desktop CSV imports now work without preprocessing. The importer automatically handles BOM/malformed headers, skips template guide rows (such as `Text` and `*Required`), and applies safe defaults for missing `date_of_birth` and invalid/missing `gender`.

Example:
```bash
python manage.py import_residents_csv ~/Desktop/residents_import_template.csv --skip-errors
```

### Step 3: Verify Import
Check the Django admin panel at `http://localhost:8000/admin/residents/resident/` to see the imported residents.

---

## Using the Excel Template - RECOMMENDED METHOD ⭐

The Excel file (`residents_import_template.xlsx`) is the **recommended** way to import resident data because it includes:

✓ **Pre-formatted headers** with all 44 field names  
✓ **Data type hints** (row 2 shows format: Date, Phone, Choice, etc.)  
✓ **Field status** (row 3 shows Required, Optional, or Default value)  
✓ **Sample data** (rows 4-5 show proper format and types)  
✓ **Reference sheet** with all choice field values (educational level, employment status, zones)  
✓ **Pre-built empty rows** for easy data entry (rows 6-25)  
✓ **Frozen header rows** so they stay visible while scrolling  
✓ **Color coding** - Yellow = Required, Green = Optional, Blue = Default value

### Quick Excel Steps:
1. Open `data/residents_import_template.xlsx` in Excel, Google Sheets, or LibreOffice
2. Review rows 2-3 for field types and requirements
3. Delete or skip the sample data rows (rows 4-5) if you prefer
4. Enter your resident data starting from row 4 onward
5. Use the "Field Reference" sheet to look up correct choice values
6. Save the file as `.xlsx` format
7. Run: `python manage.py import_residents_excel data/your_file.xlsx`

---

## Field Reference

### Required Fields (Must Not Be Empty)
| Field | Format | Example |
|-------|--------|---------|
| **first_name** | Text (max 50 chars) | Juan |
| **last_name** | Text (max 50 chars) | Dela Cruz |
| **date_of_birth** | Date (YYYY-MM-DD) | 1985-05-15 |
| **gender** | Single char: M or F | M |

### Optional Fields (Can Be Left Empty)
| Field | Format | Example |
|-------|--------|---------|
| middle_name | Text (max 50 chars) | Rose |
| suffix | Text (max 10 chars) | Jr. |
| contact_number | Phone (9-15 digits) | 09171234567 |
| email | Email address | juan@email.com |
| house_number | Text (max 20 chars) | 123 |
| street | Text (max 100 chars) | Main Street |
| emergency_contact_name | Text (max 150 chars) | Maria Dela Cruz |
| emergency_contact_number | Phone (max 15 chars) | 09281234567 |
| emergency_contact_relationship | Text (max 50 chars) | Sister |

### Choice Fields (Specific Values Only)

#### **gender**
- `M` = Male
- `F` = Female

#### **civil_status**
- `single`
- `married`
- `widowed`
- `separated`
- `divorced`

#### **zone**
- `Purok Talisay`
- `Purok Malunggay`
- `Purok Mancinitas`
- `Purok Narra`
- `Purok Kulo`
- `Purok Ipil-ipil`
- `Purok Tugas`

#### **educational_attainment**
- `no_formal`
- `elementary`
- `high_school`
- `vocational`
- `college`
- `post_graduate`

#### **employment_status**
- `employed`
- `unemployed`
- `student`
- `retired`
- `self_employed`
- `ofw`

### Boolean Fields (true/false or 1/0)
| Field | Default | Options |
|-------|---------|---------|
| is_pwd | false | true, false, 1, 0 |
| is_senior_citizen | false | true, false, 1, 0 |
| is_solo_parent | false | true, false, 1, 0 |
| is_indigenous | false | true, false, 1, 0 |
| is_4ps_beneficiary | false | true, false, 1, 0 |

### Fields with Default Values (Auto-filled if empty)
| Field | Default Value |
|-------|----------------|
| citizenship | FILIPINO |
| barangay | ABGAO |
| city_municipality | MAASIN |
| province | SOUTHERN LEYTE |
| zip_code | 6600 |
| zone | Purok Talisay |

---

## Advanced Usage

### Skip Errors During Import
If you want to import as many records as possible and skip rows with errors:
```bash
python manage.py import_residents_csv data/your_file.csv --skip-errors
```

### Example CSV Format
```
first_name,middle_name,last_name,suffix,gender,date_of_birth,place_of_birth,contact_number,email,civil_status,citizenship,house_number,street,zone,barangay,city_municipality,province,zip_code,educational_attainment,employment_status,occupation,monthly_income,father_name,mother_name,spouse_name,emergency_contact_name,emergency_contact_number,emergency_contact_relationship,voters_id,philhealth_number,sss_gsis_number,tin_number,precinct_number,is_pwd,pwd_type,is_senior_citizen,is_solo_parent,is_indigenous,is_4ps_beneficiary,blood_type,allergies,medical_conditions
Juan,,Dela Cruz,Jr.,M,1985-05-15,Maasin City,09171234567,juan@email.com,married,FILIPINO,123,Main Street,Purok Talisay,ABGAO,MAASIN,SOUTHERN LEYTE,6600,college,employed,Manager,25000.00,Jose Dela Cruz,Maria Santos,Ana Rodriguez,,,,V-12345678,PH-98765432,SSS-12-1234567-1,TIN-123-456-789,001,false,,false,false,false,false,O+,,
```

---

## Troubleshooting

### "CSV file not found" Error
Make sure the file path is correct. Use relative path from the project root:

### Excel file import errors
If you get an error importing the Excel file:

1. **"Sheet 'Residents Import' not found"** - Make sure you didn't rename the sheet. Rename it back to "Residents Import" or use `--sheet YourSheetName`
	```bash
	python manage.py import_residents_excel data/your_file.xlsx --sheet "My Sheet Name"
	```

2. **"No headers found in row 1"** - Make sure row 1 contains field names from the template

3. **Data not importing** - Check that your data starts from **row 4** onwards (rows 1-3 are for headers and info)

4. **Decimal/Number formatting issues** - Make sure monthly_income and other numeric columns are formatted as numbers, not text

5. **Date parsing error** - Dates in Excel should be formatted as **YYYY-MM-DD** or standard date format
	- Select the date column and format as: `YYYY-MM-DD` or use Excel's built-in Date format
```bash
python manage.py import_residents_csv data/your_file.csv
```

### "first_name is required" Error
Check that your CSV has values in the first_name column. Empty cells will cause an error.

### Date Format Error
Dates must be in `YYYY-MM-DD` format. Examples:
- ✓ 1985-05-15
- ✗ 05-15-1985
- ✗ 5/15/85

### Phone Number Validation Error
Phone numbers must be 9-15 digits. Examples:
- ✓ 09171234567
- ✓ +639171234567
- ✗ 091-7123-4567 (hyphens not allowed)

### Gender Must Be "M" or "F"
Use only uppercase single letters:
- ✓ M or F
- ✗ Male or Female
- ✗ m or f

---

## Verification Checklist

After importing, verify by:
1. ✓ Check admin panel: `/admin/residents/resident/`
2. ✓ Filter by date created (today)
3. ✓ Check a few records to ensure data is correct
4. ✓ Verify total count matches your import

---

## Template Location
### Excel Template (Recommended)
Location: `data/residents_import_template.xlsx`

Contains:
- Sheet 1: "Residents Import" - Main import sheet with headers, sample data, and empty rows
- Sheet 2: "Field Reference" - Lookup tables for choice fields

### CSV Template
Location: `data/residents_import_template.csv`

You can duplicate this file and modify it with your data:
```bash
# For Excel:
cp data/residents_import_template.xlsx data/my_residents.xlsx
# Edit my_residents.xlsx with your data
python manage.py import_residents_excel data/my_residents.xlsx

# For CSV:
cp data/residents_import_template.csv data/my_residents.csv
# Edit my_residents.csv with your data
python manage.py import_residents_csv data/my_residents.csv
|--------|---------|------|-------|
| **Excel** | `import_residents_excel` | `.xlsx` | ⭐ RECOMMENDED - Pre-formatted, includes reference sheet |
| CSV | `import_residents_csv` | `.csv` | Good for automated scripts |

### Skip Errors Mode
For both commands, add `--skip-errors` flag to continue importing even if some rows fail:
```bash
python manage.py import_residents_excel data/my_residents.xlsx --skip-errors
```
```
