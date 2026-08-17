from .capabilities import (
    ALL_CAPABILITIES,
    OFFICE_ROLE_NAMES,
    capabilities_for_user,
)


ROLE_SECRETARY = 'Secretary'
ROLE_BHW = 'BHW'
ROLE_CAPTAIN = 'Captain'

def user_has_any_role(user, role_names):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return user.groups.filter(name__in=tuple(role_names)).exists()


def user_has_office_role(user):
    """Compatibility bridge for views awaiting action-level capability checks."""
    return bool(capabilities_for_user(user).intersection(ALL_CAPABILITIES))
