import Link from "next/link";

type GuildRow = { guildId: string; version: number; updatedAt: string; incidentCount: number };

async function loadGuilds(): Promise<GuildRow[]> {
  const base = process.env.CONTROL_API_URL;
  const token = process.env.ADMIN_API_TOKEN;
  if (!base || !token) {
    throw new Error("Missing CONTROL_API_URL or ADMIN_API_TOKEN");
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/internal/v1/guilds`, {
    headers: { "x-admin-token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Fleet fetch failed (${res.status}): ${t}`);
  }
  const data = (await res.json()) as { guilds: GuildRow[] };
  return data.guilds;
}

export default async function FleetPage() {
  let guilds: GuildRow[] = [];
  let error: string | null = null;
  try {
    guilds = await loadGuilds();
  } catch (e) {
    error = e instanceof Error ? e.message : "unknown_error";
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <header className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Fleet directory</h1>
        <p className="mt-2 text-sm text-slate-300">
          Guilds with persisted `GuildSecurityConfig` rows (typically created after the bot joins + initializes).
        </p>
      </header>

      {error ? (
        <div className="glass rounded-2xl border border-rose-400/25 bg-rose-500/10 p-6 text-sm text-rose-50">
          <p className="font-semibold">Configuration / upstream error</p>
          <p className="mt-2 font-mono text-xs text-rose-100/90">{error}</p>
          <p className="mt-3 text-xs text-rose-100/80">
            Create `web/admin-dashboard/.env.local` with `CONTROL_API_URL` and `ADMIN_API_TOKEN` (see `.env.example`).
          </p>
        </div>
      ) : null}

      <div className="glass overflow-hidden rounded-2xl">
        <table className="table">
          <thead>
            <tr>
              <th>Guild ID</th>
              <th>Policy version</th>
              <th>Updated</th>
              <th>Incidents</th>
            </tr>
          </thead>
          <tbody>
            {guilds.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-400">
                  No guild rows yet.
                </td>
              </tr>
            ) : (
              guilds.map((g) => (
                <tr key={g.guildId}>
                  <td>{g.guildId}</td>
                  <td>{g.version}</td>
                  <td className="text-slate-300">{g.updatedAt}</td>
                  <td>{g.incidentCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Per-guild deep management UI is next; for now use DB + bot commands.{" "}
        <Link className="text-violet-200 underline" href="/keys">
          Go to keys
        </Link>
      </p>
    </main>
  );
}
