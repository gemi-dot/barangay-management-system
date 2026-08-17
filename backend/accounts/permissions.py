from rest_framework.permissions import BasePermission

from .capabilities import user_has_capability


class CapabilityPermission(BasePermission):
    """Require the capability selected by the current API view/action."""

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        resolver = getattr(view, 'get_required_capability', None)
        capability = resolver(request) if resolver else getattr(view, 'required_capability', None)
        return bool(capability and user_has_capability(request.user, capability))
