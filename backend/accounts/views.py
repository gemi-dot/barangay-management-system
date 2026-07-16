from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST


def login_view(request):
    if request.user.is_authenticated:
        return redirect('/')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect(request.GET.get('next', '/'))
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
        'username': user.username,
    })


@require_POST
def api_logout_view(request):
    logout(request)
    return JsonResponse({'detail': 'Logout successful.'})
