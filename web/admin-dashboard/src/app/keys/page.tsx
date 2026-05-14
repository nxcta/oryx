import { MintForm } from "./MintForm";

type KeyRow = {
  id: string;
  lookupPrefix: string;
  status: string;
  preboundGuildId: string | null;
  boundGuildId: string | null;
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  revokedAt: string | null;
};

async function loadKeys(): Promise<KeyRow[]> {
  const base = process.env.CONTROL_API_URL;
  const token = process.env.ADMIN_API_TOKEN;
  if (!base || !token) {
    throw new Error("Missing CONTROL_API_URL or ADMIN_API_TOKEN");
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/internal/v1/keys`, {
    headers: { "x-admin-token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Keys fetch failed (${res.status}): ${t}`);
  }
  const data = (await res.json()) as {
    keys: Array<{
      id: string;
      lookupPrefix: string;
      status: string;
      preboundGuildId: string | null;
      boundGuildId: string | null;
      createdAt: string;
      expiresAt: string;
      redeemedAt: Date | null;
      revokedAt: Date | null;
    }>;
  };

  return data.keys.map((k) => ({
    ...k,
    createdAt: new Date(k.createdAt).toISOString(),
    expiresAt: new Date(k.expiresAt).toISOString(),
    redeemedAt: k.redeemedAt ? new Date(k.redeemedAt).toISOString() : null,
    revokedAt: k.revokedAt ? new Date(k.revokedAt).toISOString() : null,
  }));
}

export default async function KeysPage() {
  let keys: KeyRow[] = [];
  let error: string | null = null;
  try {
    keys = await loadKeys();
  } catch (e) {
    error = e instanceof Error ? e.message : "unknown_error";
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <header className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Access keys</h1>
        <p className="mt-2 text-sm text-slate-300">Mint, revoke, and audit owner-console access keys.</p>
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

      <MintForm />

      <div className="glass overflow-hidden rounded-2xl">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Prefix</th>
              <th>Status</th>
              <th>Prebound</th>
              <th>Bound</th>
              <th>Created</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">
                  No keys yet.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.id}</td>
                  <td>{k.lookupPrefix}</td>
                  <td>{k.status}</td>
                  <td>{k.preboundGuildId ?? "—"}</td>
                  <td>{k.boundGuildId ?? "—"}</td>
                  <td className="text-slate-300">{k.createdAt}</td>
                  <td className="text-slate-300">{k.expiresAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
