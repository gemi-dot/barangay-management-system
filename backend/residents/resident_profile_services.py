from accounts.roles import user_has_office_role


PROFILE_TABS = ('overview', 'personal', 'household', 'family', 'documents', 'history', 'qr')


def profile_permissions(user):
    can_manage = user_has_office_role(user)
    return {
        'visible_tabs': list(PROFILE_TABS) if can_manage else [],
        'actions': {
            'view_household': can_manage,
            'manage_household': can_manage,
            'manage_family': can_manage,
            'view_qr': can_manage,
            'manage_documents': can_manage,
            'manage_qr': can_manage,
        },
    }


def profile_summary(resident, active_membership):
    return {
        'household_number': active_membership.household.household_number if active_membership else None,
        'purok': resident.zone,
        'registered_voter': bool(resident.voters_id),
        'special_classifications': sum((
            resident.is_senior_citizen,
            resident.is_pwd,
            resident.is_4ps_beneficiary,
            resident.is_solo_parent,
        )),
    }


def profile_alerts(resident, active_membership):
    alerts = []
    if not active_membership:
        alerts.append({'code': 'missing_household', 'message': 'No active household is assigned.'})
    if not resident.contact_number:
        alerts.append({'code': 'missing_contact', 'message': 'Contact number is incomplete.'})
    if not resident.street or not resident.house_number:
        alerts.append({'code': 'incomplete_address', 'message': 'Residential address is incomplete.'})
    if resident.date_of_birth.year == 1900:
        alerts.append({'code': 'placeholder_birth_date', 'message': 'Birth date still uses the legacy placeholder.'})
    return alerts
