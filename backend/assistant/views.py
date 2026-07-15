import json
import re

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST

from .models import FAQ


OVERLAP_TOKEN_WEIGHT = 1
QUESTION_PHRASE_WEIGHT = 3
KEYWORD_TOKEN_WEIGHT = 1
KEYWORD_PHRASE_WEIGHT = 8
KEYWORD_EXACT_WEIGHT = 4

# Requests that look like personal/official record access are intentionally blocked.
RESTRICTED_ACCESS_TERMS = {
	"resident record",
	"resident records",
	"residents record",
	"residents records",
	"barangay record",
	"barangay records",
	"personal record",
	"personal records",
	"profile",
	"resident list",
	"household list",
	"voter list",
	"show resident",
	"find resident",
	"search resident",
}


def _is_restricted_access_request(message_text):
	if not message_text:
		return False

	for term in RESTRICTED_ACCESS_TERMS:
		if term in message_text:
			return True

	# Broad fallback for direct resident/record lookup intents.
	if "resident" in message_text and any(token in message_text for token in ["record", "details", "information", "info", "data"]):
		return True

	return False


def _tokenize(text):
	"""Return lowercase alphanumeric tokens for simple FAQ matching."""
	if not text:
		return set()
	return set(re.findall(r"[a-zA-Z0-9]+", text.lower()))


@require_GET
def faq_chatbot_view(request):
	faqs = FAQ.objects.filter(is_active=True).select_related("category").order_by("category__name", "question")
	return render(request, "assistant/faq_chatbot.html", {"faqs": faqs})


@require_POST
def faq_chat_api(request):
	try:
		payload = json.loads(request.body.decode("utf-8"))
	except (json.JSONDecodeError, UnicodeDecodeError):
		return JsonResponse({"error": "Invalid JSON payload."}, status=400)

	user_message = str(payload.get("message", "")).strip()
	if not user_message:
		return JsonResponse({"error": "Please type a question."}, status=400)

	message_text = user_message.lower()
	if _is_restricted_access_request(message_text):
		return JsonResponse(
			{
				"answer": "I can only answer public FAQ questions. I cannot access resident profiles, household records, voter lists, or other barangay records.",
				"matched_question": None,
				"suggestions": [],
			}
		)

	faqs = FAQ.objects.filter(is_active=True)
	if not faqs.exists():
		return JsonResponse(
			{
				"answer": "No FAQ entries are available yet. Please ask the barangay admin to add FAQ items in the admin panel.",
				"matched_question": None,
				"suggestions": [],
			}
		)

	message_tokens = _tokenize(user_message)

	best_faq = None
	best_score = 0
	scored_results = []

	for faq in faqs:
		question_text = faq.question.lower()
		question_tokens = _tokenize(faq.question)

		overlap_score = len(message_tokens.intersection(question_tokens)) * OVERLAP_TOKEN_WEIGHT
		phrase_score = 0
		keyword_phrase_hits = 0

		if message_text in question_text:
			phrase_score += QUESTION_PHRASE_WEIGHT
		if question_text in message_text:
			phrase_score += QUESTION_PHRASE_WEIGHT

		keyword_score = 0
		if faq.keywords:
			keywords = [kw.strip().lower() for kw in faq.keywords.split(",") if kw.strip()]
			for keyword in keywords:
				if keyword in message_text:
					keyword_phrase_hits += 1
					keyword_score += KEYWORD_PHRASE_WEIGHT
				if keyword == message_text:
					keyword_score += KEYWORD_EXACT_WEIGHT
				keyword_tokens = _tokenize(keyword)
				if keyword_tokens:
					keyword_score += len(message_tokens.intersection(keyword_tokens)) * KEYWORD_TOKEN_WEIGHT

		total_score = overlap_score + phrase_score + keyword_score
		if total_score > 0:
			scored_results.append((total_score, keyword_phrase_hits, faq))

		if total_score > best_score:
			best_score = total_score
			best_faq = faq

	scored_results.sort(key=lambda item: (item[0], item[1]), reverse=True)
	suggestions = [item[2].question for item in scored_results[:3]]

	if best_faq:
		return JsonResponse(
			{
				"answer": best_faq.answer,
				"matched_question": best_faq.question,
				"category": best_faq.category.name,
				"suggestions": suggestions,
			}
		)

	return JsonResponse(
		{
			"answer": "I could not find an exact FAQ answer. Try asking in another way or contact the barangay office.",
			"matched_question": None,
			"suggestions": [faq.question for faq in faqs[:3]],
		}
	)
