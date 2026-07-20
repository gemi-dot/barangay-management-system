"use client";

import { useState } from "react";
import { Bot, ClipboardList, Download, MessageSquare, Sparkles } from "lucide-react";

import { ExecutivePageHeader } from "@/components/enterprise/ExecutivePageHeader";
import { ExportButtons } from "@/components/enterprise/ExportButtons";
import { ModuleQuickActions } from "@/components/enterprise/ModuleQuickActions";
import { StatisticsSidebar } from "@/components/enterprise/StatisticsSidebar";
import { ContentContainer } from "@/components/layout/ContentContainer";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
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
  const messageRows = messages.map((message, index) => ({ id: index + 1, ...message }));

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

      <ExecutivePageHeader
        subtitle="Assistant Module"
        title="AI Assistant Executive Workspace"
        description="Enterprise conversational assistant for barangay FAQs, operational guidance, and service process support."
        badges={<StatusBadge label="FAQ mode" tone="info" />}
        actions={
          <ExportButtons
            rows={messages}
            fileName="assistant-conversation-export.csv"
            toExportRecord={(message) => ({ role: message.role, text: message.text })}
            disabled={loading}
          />
        }
      />

      <ModuleQuickActions
        actions={[
          { label: "Dashboard", description: "Return to command center", href: "/", icon: ClipboardList, tone: "blue" },
          { label: "Reports", description: "Open reports analytics", href: "/reports", icon: Download, tone: "emerald" },
          { label: "BHW Reports", description: "View community health records", href: "/bhw-reports", icon: Sparkles, tone: "amber" },
          { label: "Document Queue", description: "Open service request queue", href: "/document-requests", icon: MessageSquare, tone: "slate" },
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Conversation Messages" value={messages.length} icon={MessageSquare} />
        <StatCard label="Assistant Replies" value={messages.filter((message) => message.role === "assistant").length} icon={Bot} />
        <StatCard label="User Questions" value={messages.filter((message) => message.role === "user").length} icon={Sparkles} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_330px]">
        <div className="space-y-4">
          <SectionCard title="Assistant Conversation" description="Ask questions and receive FAQ-guided responses.">
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

          <SectionCard title="Conversation Table" description="Responsive tabular view of the current conversation.">
            <DataTable
              columns={[
                { key: "index", header: "#", render: (row) => row.id },
                { key: "role", header: "Role", render: (row) => row.role },
                { key: "text", header: "Message", render: (row) => row.text },
              ]}
              rows={messageRows}
              rowKey={(row) => row.id}
              emptyTitle="No conversation yet"
              emptyDescription="Start by asking the assistant a question."
            />
          </SectionCard>
        </div>

        <StatisticsSidebar
          title="Statistics Sidebar"
          stats={[
            { label: "Pending Send", value: loading ? "Yes" : "No" },
            { label: "Last Input", value: input || "None" },
            { label: "Assistant Lines", value: String(messages.filter((message) => message.role === "assistant").length) },
            { label: "User Lines", value: String(messages.filter((message) => message.role === "user").length) },
          ]}
        />
      </section>
    </ContentContainer>
  );
}
