"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [rawKey, setRawKey] = useState("");
  const [guildId, setGuildId] = useState("");
  const [discordUserId, setDiscordUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawKey, guildId, discordUserId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "redeem_failed");
        return;
      }
      router.push("/console");
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <div className="glass rounded-2xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">Owner access</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">Redeem your key</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Paste the key issued by Oryx staff. This binds the dashboard session to the guild you specify. Replace
          Discord OAuth in production — this MVP trusts the IDs you enter.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="rawKey">
              Access key
            </label>
            <textarea
              id="rawKey"
              className="input min-h-[96px] font-mono text-xs"
              value={rawKey}
              onChange={(e) => setRawKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="oryx_…"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="guildId">
              Guild ID
            </label>
            <input id="guildId" className="input font-mono text-xs" value={guildId} onChange={(e) => setGuildId(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="discordUserId">
              Your Discord user ID
            </label>
            <input
              id="discordUserId"
              className="input font-mono text-xs"
              value={discordUserId}
              onChange={(e) => setDiscordUserId(e.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Redeeming…" : "Redeem & enter console"}
            </button>
            <Link className="btn btn-ghost" href="/">
              Back
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
