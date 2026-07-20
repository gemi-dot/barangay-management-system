from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.http import JsonResponse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from .roles import OFFICE_ROLE_NAMES, user_has_office_role


def _safe_next_url(request, fallback='/'):
    candidate = (request.POST.get('next') or request.GET.get('next') or '').strip()
    if candidate and url_has_allowed_host_and_scheme(
        url=candidate,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return candidate
    return fallback


def login_view(request):
    if request.user.is_authenticated:
        return redirect('/')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect(_safe_next_url(request))
        messages.error(request, 'Invalid username or password.')
    return render(request, 'accounts/login.html')


def logout_view(request):
    if request.method == 'POST':
        logout(request)
    return redirect('/accounts/login/')


@ensure_csrf_cookie
@require_GET
def session_view(request):
    user = request.user
    is_authenticated = bool(user.is_authenticated)

    return JsonResponse({
        'is_authenticated': is_authenticated,
        'is_staff': bool(is_authenticated and user.is_staff),
        'has_office_role': bool(is_authenticated and user_has_office_role(user)),
        'office_roles': list(user.groups.filter(name__in=OFFICE_ROLE_NAMES).values_list('name', flat=True)) if is_authenticated else [],
        'username': user.username if is_authenticated else '',
        'full_name': user.get_full_name() if is_authenticated else '',
    })


@require_POST
def api_login_view(request):
    username = request.POST.get('username', '').strip()
    password = request.POST.get('password', '')

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({'detail': 'Invalid username or password.'}, status=401)

    login(request, user)
    return JsonResponse({
        'detail': 'Login successful.',
        'is_staff': bool(user.is_staff),
        'has_office_role': user_has_office_role(user),
        'office_roles': list(user.groups.filter(name__in=OFFICE_ROLE_NAMES).values_list('name', flat=True)),
        'username': user.username,
    })


@require_POST
def api_logout_view(request):
    logout(request)
    return JsonResponse({'detail': 'Logout successful.'})
