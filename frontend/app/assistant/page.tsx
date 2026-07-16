"use client";

import { useState } from "react";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { askAssistant } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Ask me about barangay FAQ topics (requirements, processes, and schedules).",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await askAssistant(message);
      const suggestionLine = response.suggestions?.length
        ? `\n\nSuggestions:\n- ${response.suggestions.join("\n- ")}`
        : "";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `${response.answer}${suggestionLine}` },
      ]);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Assistant request failed.";
      setError(messageText);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <SessionRoleBanner />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Assistant</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Barangay FAQ Assistant</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Next.js migration of assistant UI with the existing backend FAQ chat API.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="max-h-[24rem] space-y-3 overflow-auto rounded-md border bg-zinc-50 p-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  message.role === "user"
                    ? "ml-auto max-w-[85%] bg-zinc-900 text-white"
                    : "max-w-[90%] bg-white text-zinc-800"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={submitQuestion} className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your question"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Ask"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
