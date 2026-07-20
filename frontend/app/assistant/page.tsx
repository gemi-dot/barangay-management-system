"use client";

import { useState } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { ErrorState } from "@/components/ui/ErrorState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
    <ContentContainer>
      <SessionRoleBanner />

      <PageHeader
        eyebrow="Assistant"
        title="Barangay FAQ Assistant"
        description="Next.js migration of assistant UI with the existing backend FAQ chat API."
        meta={<StatusBadge label="FAQ mode" tone="info" />}
      />

      <SectionCard>
        <div className="max-h-[24rem] space-y-3 overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto max-w-[85%] bg-[var(--color-nav-bg)] text-white"
                  : "max-w-[90%] bg-white text-zinc-800"
              }`}
            >
              {message.text}
            </div>
          ))}
        </div>

        {error ? <div className="mt-3"><ErrorState message={error} /></div> : null}

        <form onSubmit={submitQuestion} className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your question"
            className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Sending..." : "Ask"}
          </PrimaryButton>
        </form>
      </SectionCard>
    </ContentContainer>
  );
}
