from accounts.capabilities import (
    DIGITAL_ID_ISSUE,
    DIGITAL_ID_PRINT,
    DIGITAL_ID_REISSUE,
    DIGITAL_ID_REVOKE,
    DIGITAL_ID_VERIFY,
    DIGITAL_ID_VIEW,
    DOCUMENT_APPROVE,
    DOCUMENT_CREATE,
    DOCUMENT_PRINT,
    DOCUMENT_PROCESS,
    DOCUMENT_RELEASE,
    DOCUMENT_VIEW,
    FAMILY_MANAGE,
    FAMILY_VIEW,
    HOUSEHOLD_MANAGE,
    HOUSEHOLD_VIEW,
    capabilities_for_user,
)


PROFILE_TABS = ('overview', 'personal', 'household', 'family', 'documents', 'history', 'qr')


def profile_permissions(user):
    capabilities = capabilities_for_user(user)
    can_manage = bool(capabilities)
    visible_tabs = [
        tab for tab in PROFILE_TABS
        if can_manage
        and (tab != 'documents' or DOCUMENT_VIEW in capabilities)
        and (tab != 'qr' or DIGITAL_ID_VIEW in capabilities)
    ]
    return {
        'visible_tabs': visible_tabs,
        'actions': {
            'view_household': HOUSEHOLD_VIEW in capabilities,
            'manage_household': HOUSEHOLD_MANAGE in capabilities,
            'view_family': FAMILY_VIEW in capabilities,
            'manage_family': FAMILY_MANAGE in capabilities,
            'view_documents': DOCUMENT_VIEW in capabilities,
            'create_document': DOCUMENT_CREATE in capabilities,
            'process_document': DOCUMENT_PROCESS in capabilities,
            'approve_document': DOCUMENT_APPROVE in capabilities,
            'release_document': DOCUMENT_RELEASE in capabilities,
            'print_document': DOCUMENT_PRINT in capabilities,
            'view_qr': DIGITAL_ID_VIEW in capabilities,
            'verify_qr': DIGITAL_ID_VERIFY in capabilities,
            'issue_qr': DIGITAL_ID_ISSUE in capabilities,
            'reissue_qr': DIGITAL_ID_REISSUE in capabilities,
            'revoke_qr': DIGITAL_ID_REVOKE in capabilities,
            'print_qr': DIGITAL_ID_PRINT in capabilities,
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
