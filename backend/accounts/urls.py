from django.urls import path
from . import views

urlpatterns = [
    path('login', views.login_view, name='login-no-slash'),
    path('login/', views.login_view, name='login'),
    path('logout', views.logout_view, name='logout-no-slash'),
    path('logout/', views.logout_view, name='logout'),
    path('api/session', views.session_view, name='session-no-slash'),
    path('api/session/', views.session_view, name='session'),
    path('api/login', views.api_login_view, name='api_login-no-slash'),
    path('api/login/', views.api_login_view, name='api_login'),
    path('api/logout', views.api_logout_view, name='api_logout-no-slash'),
    path('api/logout/', views.api_logout_view, name='api_logout'),
]
