from django.urls import path

from . import views

app_name = "assistant"

urlpatterns = [
    path("", views.faq_chatbot_view, name="faq_chatbot"),
    path("api/ask/", views.faq_chat_api, name="faq_chat_api"),
]
