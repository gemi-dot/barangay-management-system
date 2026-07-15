from django.db import models

# Create your models here.
# assistant/models.py

from django.db import models


class FAQCategory(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class FAQ(models.Model):
    category = models.ForeignKey(
        FAQCategory,
        on_delete=models.CASCADE,
        related_name="faqs"
    )
    question = models.CharField(max_length=255)
    answer = models.TextField()
    keywords = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.question


class Conversation(models.Model):
    resident = models.ForeignKey(
        "residents.Resident",   # change this to your actual Resident model path
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    role = models.CharField(
        max_length=10,
        choices=(("user", "User"), ("bot", "Bot"))
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)