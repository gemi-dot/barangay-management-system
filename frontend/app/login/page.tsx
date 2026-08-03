"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { useSessionAuth } from "@/components/session-context";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSessionAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      router.push("/");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Login failed.";
      setError(text);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ContentContainer>
      <div className="mx-auto max-w-sm">
        <SectionCard title="Sign in" description="Sign in with your staff account to access Barangay IMS.">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium text-[var(--color-text-secondary)]">
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-[var(--color-text-secondary)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <PrimaryButton type="submit" disabled={submitting} className="w-full">
              {submitting ? "Signing in..." : "Sign in"}
            </PrimaryButton>
          </form>
        </SectionCard>
      </div>
    </ContentContainer>
  );
}
