ROLE_SECRETARY = 'Secretary'
ROLE_BHW = 'BHW'
ROLE_CAPTAIN = 'Captain'

OFFICE_ROLE_NAMES = (
    ROLE_SECRETARY,
    ROLE_BHW,
    ROLE_CAPTAIN,
)


def user_has_any_role(user, role_names):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return user.groups.filter(name__in=tuple(role_names)).exists()


def user_has_office_role(user):
    return user_has_any_role(user, OFFICE_ROLE_NAMES)
