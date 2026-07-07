from inventory.models import Asset, Category


def load_inventory_sample_entries():
    category_aliases = {
        'ICT Equipment': Category.NameChoices.ICT_EQUIPMENT,
        'Office Furniture': Category.NameChoices.OFFICE_FURNITURE,
        'Furniture': Category.NameChoices.OFFICE_FURNITURE,
        'Office Equipment': Category.NameChoices.OFFICE_EQUIPMENT,
        'Equipment': Category.NameChoices.OFFICE_EQUIPMENT,
        'Medical Equipment': Category.NameChoices.MEDICAL_EQUIPMENT,
        'Disaster Equipment': Category.NameChoices.DISASTER_EQUIPMENT,
        'Safety Equipment': Category.NameChoices.SAFETY_EQUIPMENT,
        'Security Equipment': Category.NameChoices.SAFETY_EQUIPMENT,
        'Communication Equipment': Category.NameChoices.COMMUNICATION_EQUIPMENT,
        'Vehicle': Category.NameChoices.VEHICLE,
        'Heavy Equipment': Category.NameChoices.HEAVY_EQUIPMENT,
        'Tools & Equipment': Category.NameChoices.TOOLS_AND_EQUIPMENT,
        'Tools and Equipment': Category.NameChoices.TOOLS_AND_EQUIPMENT,
    }

    location_aliases = {
        'Barangay Hall': Asset.LocationChoices.BARANGAY_HALL,
        'Barangay Hall Entrance': Asset.LocationChoices.BARANGAY_HALL,
        'Barangay Office': Asset.LocationChoices.BARANGAY_OFFICE,
        'Punong Barangay Office': Asset.LocationChoices.BARANGAY_OFFICE,
        'Health Center': Asset.LocationChoices.HEALTH_CENTER,
        'Health Station': Asset.LocationChoices.HEALTH_CENTER,
        'Multi-Purpose Hall': Asset.LocationChoices.MULTI_PURPOSE_HALL,
        'Covered Court': Asset.LocationChoices.COVERED_COURT,
        'DRRM Storage': Asset.LocationChoices.DRRM_STORAGE,
        'Records Room': Asset.LocationChoices.RECORDS_ROOM,
        'Storage Room': Asset.LocationChoices.STORAGE_ROOM,
        'Maintenance Area': Asset.LocationChoices.STORAGE_ROOM,
        'Garage': Asset.LocationChoices.GARAGE,
        'Barangay Garage': Asset.LocationChoices.GARAGE,
    }

    role_aliases = {
        'Punong Barangay': Asset.ResponsibleRoleChoices.PUNONG_BARANGAY,
        'Barangay Captain': Asset.ResponsibleRoleChoices.PUNONG_BARANGAY,
        'Barangay Secretary': Asset.ResponsibleRoleChoices.BARANGAY_SECRETARY,
        'Barangay Treasurer': Asset.ResponsibleRoleChoices.BARANGAY_TREASURER,
        'Barangay Kagawad': Asset.ResponsibleRoleChoices.BARANGAY_KAGAWAD,
        'Barangay Health Worker': Asset.ResponsibleRoleChoices.BARANGAY_HEALTH_WORKER,
        'DRRM Coordinator': Asset.ResponsibleRoleChoices.DRRM_COORDINATOR,
        'SK Chairman': Asset.ResponsibleRoleChoices.SK_CHAIRMAN,
        'Barangay Utility Worker': Asset.ResponsibleRoleChoices.UTILITY_WORKER,
        'Utility Worker': Asset.ResponsibleRoleChoices.UTILITY_WORKER,
        'Administrative Aide': Asset.ResponsibleRoleChoices.ADMINISTRATIVE_AIDE,
    }

    condition_aliases = {
        'Excellent': Asset.ConditionChoices.EXCELLENT,
        'Very Good': Asset.ConditionChoices.VERY_GOOD,
        'Good': Asset.ConditionChoices.GOOD,
        'Fair': Asset.ConditionChoices.FAIR,
        'Poor': Asset.ConditionChoices.POOR,
        'Unserviceable': Asset.ConditionChoices.UNSERVICEABLE,
        'For Disposal': Asset.ConditionChoices.FOR_DISPOSAL,
    }

    rows = [
        ('ABG-ICT-2026-0001', 'Desktop Computer', 'ICT Equipment', 'Good', 'Barangay Office', 'Barangay Secretary'),
        ('ABG-ICT-2026-0002', 'Printer', 'ICT Equipment', 'Good', 'Barangay Office', 'Barangay Secretary'),
        ('ABG-FUR-2026-0003', 'Office Table', 'Office Furniture', 'Good', 'Barangay Office', 'Punong Barangay'),
        ('ABG-DRR-2026-0004', 'Emergency Light', 'Disaster Equipment', 'Good', 'DRRM Storage', 'DRRM Coordinator'),
        ('ABG-MED-2026-0005', 'Blood Pressure Monitor', 'Medical Equipment', 'Good', 'Health Center', 'Barangay Health Worker'),
        ('ABG-VEH-2026-0006', 'Barangay Motorcycle', 'Vehicle', 'Good', 'Garage', 'Punong Barangay'),
        ('BRGY-2026-0007', 'Folding Tables (10 pcs)', 'Furniture', 'Good', 'Multi-Purpose Hall', 'Barangay Kagawad'),
        ('BRGY-2026-0008', 'Sound System Set', 'Equipment', 'Fair', 'Covered Court', 'SK Chairman'),
        ('BRGY-2026-0009', 'Portable Generator 5kVA', 'Heavy Equipment', 'Good', 'Storage Room', 'Barangay Captain'),
        ('BRGY-2026-0010', 'Chainsaw', 'Tools & Equipment', 'Good', 'Maintenance Area', 'Barangay Utility Worker'),
        ('BRGY-2026-0011', 'Grass Cutter', 'Tools & Equipment', 'Fair', 'Maintenance Area', 'Barangay Utility Worker'),
        ('BRGY-2026-0012', 'Fire Extinguisher (10 lbs)', 'Safety Equipment', 'Good', 'Barangay Hall Entrance', 'Barangay Secretary'),
        ('BRGY-2026-0013', 'CCTV Camera Set (8 Channels)', 'Security Equipment', 'Excellent', 'Barangay Hall', 'Barangay Captain'),
        ('BRGY-2026-0014', 'First Aid Cabinet', 'Medical Equipment', 'Good', 'Health Station', 'Barangay Health Worker'),
        ('BRGY-2026-0015', 'Digital Blood Pressure Monitor', 'Medical Equipment', 'Excellent', 'Health Center', 'Barangay Health Worker'),
        ('BRGY-2026-0016', 'Wheelchair', 'Medical Equipment', 'Good', 'Health Center', 'Barangay Health Worker'),
        ('BRGY-2026-0017', 'Rescue Boat (Fiberglass)', 'Disaster Equipment', 'Good', 'DRRM Storage', 'DRRM Coordinator'),
        ('BRGY-2026-0018', 'Rescue Life Vest (25 pcs)', 'Disaster Equipment', 'Good', 'DRRM Storage', 'DRRM Coordinator'),
        ('BRGY-2026-0019', 'Megaphone', 'Communication Equipment', 'Good', 'Barangay Office', 'Barangay Captain'),
        ('BRGY-2026-0020', 'Toyota Hilux Service Vehicle', 'Vehicle', 'Excellent', 'Barangay Garage', 'Punong Barangay'),
    ]

    created = 0
    updated = 0
    details = []

    for property_number, description, category_name, condition_name, location_name, role_name in rows:
        category_key = category_aliases.get(category_name, Category.NameChoices.OFFICE_EQUIPMENT)
        location_key = location_aliases.get(location_name, Asset.LocationChoices.BARANGAY_OFFICE)
        condition_key = condition_aliases.get(condition_name, Asset.ConditionChoices.GOOD)
        role_key = role_aliases.get(role_name, '')

        category_obj, _ = Category.objects.get_or_create(
            name=category_key,
            defaults={'description': ''},
        )

        defaults = {
            'description': description,
            'category': category_obj,
            'condition': condition_key,
            'location': location_key,
            'responsible_role': role_key,
            'status': Asset.StatusChoices.ACTIVE,
        }

        asset, was_created = Asset.objects.update_or_create(
            property_number=property_number,
            defaults=defaults,
        )

        details.append({'property_number': asset.property_number, 'created': was_created})
        if was_created:
            created += 1
        else:
            updated += 1

    return {
        'created': created,
        'updated': updated,
        'total': len(rows),
        'details': details,
    }
