"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = {
  guildId?: string | null;
  discordUserId?: string | null;
  expiresAt?: string;
  policy?: { version: number; updatedAt: string } | null;
};

export default function ConsolePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tenant/me", { cache: "no-store" });
      const data = (await res.json()) as Me & { error?: string };
      if (!res.ok) {
        if (!cancelled) setError(data.error ?? "unauthorized");
        return;
      }
      if (!cancelled) setMe(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/tenant/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-slate-50">Session required</h1>
          <p className="mt-3 text-sm text-slate-300">Error: {error}</p>
          <div className="mt-6 flex gap-3">
            <Link className="btn btn-primary" href="/login">
              Redeem a key
            </Link>
            <Link className="btn btn-ghost" href="/">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
        <div className="glass rounded-2xl p-8">
          <p className="text-sm text-slate-300">Loading session…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">Oryx / Console</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">Guild overview</h1>
          <p className="mt-2 text-sm text-slate-300">
            Bound guild <span className="font-mono text-cyan-200">{me.guildId}</span> — operator{" "}
            <span className="font-mono text-cyan-200">{me.discordUserId}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="btn btn-ghost" href="/">
            Home
          </Link>
          <button className="btn btn-primary" type="button" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-xl p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-cyan-200">Bot policy snapshot</h2>
          <p className="mt-3 text-sm text-slate-300">
            {me.policy ? (
              <>
                Policy version <span className="font-mono text-slate-100">{me.policy.version}</span> — last updated{" "}
                <span className="font-mono text-slate-100">{me.policy.updatedAt}</span>
              </>
            ) : (
              "No `GuildSecurityConfig` row yet — invite/run the bot in this guild to initialize policy storage."
            )}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cyan-200">Session</h2>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Expires <span className="font-mono text-slate-200">{me.expiresAt}</span>
          </p>
        </div>
      </section>

      <section className="glass rounded-xl p-6">
        <h2 className="text-sm font-semibold text-cyan-200">Next build-out (roadmap)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>Discord OAuth to prove `discordUserId` + guild permissions automatically.</li>
          <li>Live timelines from `SecurityEventLog` + charts (SSE/WebSocket).</li>
          <li>Threshold editors wired to Prisma `policyJson` with optimistic locking.</li>
        </ul>
      </section>
    </main>
  );
}
