from django.conf import settings
from django.contrib.auth import get_user_model, login


class DevelopmentAutoLoginMiddleware:
    """
    Automatically signs in a dedicated staff user during local development.

    This middleware is disabled unless:
    - Django DEBUG is True
    - DEV_AUTO_LOGIN is enabled
    - The request host is localhost or 127.0.0.1
    """

    LOCAL_HOSTS = {"localhost", "127.0.0.1", "[::1]"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        enabled = settings.DEBUG and getattr(settings, "DEV_AUTO_LOGIN", False)

        hostname = request.get_host().split(":")[0]

        if enabled and hostname in self.LOCAL_HOSTS and not request.user.is_authenticated:
            username = getattr(settings, "DEV_AUTO_LOGIN_USERNAME", "devstaff")

            User = get_user_model()

            try:
                user = User.objects.get(
                    username=username,
                    is_active=True,
                )
            except User.DoesNotExist:
                user = None

            if user is not None:
                login(
                    request,
                    user,
                    backend="django.contrib.auth.backends.ModelBackend",
                )

        return self.get_response(request)