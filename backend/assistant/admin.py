from django.contrib import admin
from .models import FAQ, FAQCategory, Conversation, Message


@admin.register(FAQCategory)
class FAQCategoryAdmin(admin.ModelAdmin):
	list_display = ("name",)
	search_fields = ("name",)


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
	list_display = ("question", "category", "is_active")
	list_filter = ("category", "is_active")
	search_fields = ("question", "answer", "keywords")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
	list_display = ("id", "resident", "created_at")
	list_filter = ("created_at",)
	search_fields = ("resident__first_name", "resident__last_name")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
	list_display = ("conversation", "role", "created_at")
	list_filter = ("role", "created_at")
	search_fields = ("content",)
