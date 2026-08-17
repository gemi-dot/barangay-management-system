"""Canonical BIMS capabilities and role permission bundles.

Backend views are the authority for authorization.  Role names are resolved to
capability bundles here so individual views do not need to encode role policy.
"""

DASHBOARD_VIEW = 'dashboard.view'

RESIDENT_VIEW_BASIC = 'resident.view_basic'
RESIDENT_VIEW_SENSITIVE = 'resident.view_sensitive'
RESIDENT_CREATE = 'resident.create'
RESIDENT_EDIT = 'resident.edit'
RESIDENT_LIFECYCLE_ARCHIVE = 'resident.lifecycle_archive'
RESIDENT_LIFECYCLE_TRANSFER = 'resident.lifecycle_transfer'
RESIDENT_LIFECYCLE_DECEASED = 'resident.lifecycle_deceased'
RESIDENT_RESTORE = 'resident.restore'
RESIDENT_DELETE = 'resident.delete'

HOUSEHOLD_VIEW = 'household.view'
HOUSEHOLD_MANAGE = 'household.manage'
HOUSEHOLD_CHANGE_HEAD = 'household.change_head'

FAMILY_VIEW = 'family.view'
FAMILY_MANAGE = 'family.manage'

DOCUMENT_VIEW = 'document.view'
DOCUMENT_CREATE = 'document.create'
DOCUMENT_PROCESS = 'document.process'
DOCUMENT_APPROVE = 'document.approve'
DOCUMENT_RELEASE = 'document.release'
DOCUMENT_PRINT = 'document.print'
DOCUMENT_EXPORT = 'document.export'

DIGITAL_ID_VIEW = 'digital_id.view'
DIGITAL_ID_VERIFY = 'digital_id.verify'
DIGITAL_ID_ISSUE = 'digital_id.issue'
DIGITAL_ID_REISSUE = 'digital_id.reissue'
DIGITAL_ID_REVOKE = 'digital_id.revoke'
DIGITAL_ID_PRINT = 'digital_id.print'

INVENTORY_VIEW = 'inventory.view'
INVENTORY_MANAGE = 'inventory.manage'
INVENTORY_STATUS_CHANGE = 'inventory.status_change'
INVENTORY_DELETE = 'inventory.delete'
INVENTORY_EXPORT = 'inventory.export'

HEALTH_VIEW = 'health.view'
HEALTH_MANAGE = 'health.manage'
HEALTH_EXPORT = 'health.export'

REPORTS_VIEW = 'reports.view'
REPORTS_EXPORT = 'reports.export'

SETTINGS_VIEW = 'settings.view'
SETTINGS_MANAGE = 'settings.manage'
USERS_MANAGE = 'users.manage'


ALL_CAPABILITIES = frozenset({
    value
    for name, value in globals().copy().items()
    if name.isupper() and isinstance(value, str) and '.' in value
})


ROLE_CAPABILITIES = {
    'Secretary': frozenset({
        DASHBOARD_VIEW,
        RESIDENT_VIEW_BASIC, RESIDENT_VIEW_SENSITIVE, RESIDENT_CREATE, RESIDENT_EDIT,
        RESIDENT_LIFECYCLE_ARCHIVE, RESIDENT_LIFECYCLE_TRANSFER,
        HOUSEHOLD_VIEW, HOUSEHOLD_MANAGE, HOUSEHOLD_CHANGE_HEAD,
        FAMILY_VIEW, FAMILY_MANAGE,
        DOCUMENT_VIEW, DOCUMENT_CREATE, DOCUMENT_PROCESS, DOCUMENT_RELEASE,
        DOCUMENT_PRINT, DOCUMENT_EXPORT,
        DIGITAL_ID_VIEW, DIGITAL_ID_VERIFY, DIGITAL_ID_ISSUE, DIGITAL_ID_PRINT,
        INVENTORY_VIEW, INVENTORY_MANAGE, INVENTORY_STATUS_CHANGE, INVENTORY_EXPORT,
        REPORTS_VIEW, REPORTS_EXPORT,
        SETTINGS_VIEW,
    }),
    'BHW': frozenset({
        DASHBOARD_VIEW,
        RESIDENT_VIEW_BASIC,
        HOUSEHOLD_VIEW,
        FAMILY_VIEW,
        DIGITAL_ID_VERIFY,
        HEALTH_VIEW, HEALTH_MANAGE, HEALTH_EXPORT,
        REPORTS_VIEW,
    }),
    'Captain': frozenset({
        DASHBOARD_VIEW,
        RESIDENT_VIEW_BASIC, RESIDENT_VIEW_SENSITIVE,
        RESIDENT_LIFECYCLE_ARCHIVE, RESIDENT_LIFECYCLE_TRANSFER,
        RESIDENT_LIFECYCLE_DECEASED, RESIDENT_RESTORE,
        HOUSEHOLD_VIEW, HOUSEHOLD_CHANGE_HEAD,
        FAMILY_VIEW,
        DOCUMENT_VIEW, DOCUMENT_APPROVE, DOCUMENT_PRINT, DOCUMENT_EXPORT,
        DIGITAL_ID_VIEW, DIGITAL_ID_VERIFY, DIGITAL_ID_REISSUE,
        DIGITAL_ID_REVOKE, DIGITAL_ID_PRINT,
        INVENTORY_VIEW, INVENTORY_STATUS_CHANGE, INVENTORY_EXPORT,
        HEALTH_VIEW,
        REPORTS_VIEW, REPORTS_EXPORT,
        SETTINGS_VIEW, SETTINGS_MANAGE,
    }),
}

OFFICE_ROLE_NAMES = tuple(ROLE_CAPABILITIES)


def roles_for_user(user):
    """Return assigned BIMS role names; superuser is reported separately."""
    if not user or not user.is_authenticated:
        return []

    roles = list(
        user.groups.filter(name__in=OFFICE_ROLE_NAMES)
        .values_list('name', flat=True)
        .order_by('name')
    )
    if user.is_superuser:
        roles.append('Superuser')
    return roles


def capabilities_for_user(user):
    """Return the effective capability set for a user, defaulting to deny."""
    if not user or not user.is_authenticated:
        return frozenset()
    if user.is_superuser:
        return ALL_CAPABILITIES

    capabilities = set()
    assigned_roles = user.groups.filter(name__in=OFFICE_ROLE_NAMES).values_list('name', flat=True)
    for role_name in assigned_roles:
        capabilities.update(ROLE_CAPABILITIES.get(role_name, ()))
    return frozenset(capabilities)


def user_has_capability(user, capability):
    """Return whether a user has one registered BIMS capability."""
    if capability not in ALL_CAPABILITIES:
        return False
    return capability in capabilities_for_user(user)
