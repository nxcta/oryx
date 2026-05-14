"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MintForm() {
  const router = useRouter();
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [preboundGuildId, setPreboundGuildId] = useState("");
  const [createdBySubject, setCreatedBySubject] = useState("operator");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function mint(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRawKey(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expiresInDays,
          preboundGuildId: preboundGuildId.trim() ? preboundGuildId.trim() : undefined,
          createdBySubject,
        }),
      });
      const data = (await res.json()) as { error?: string; rawKey?: string };
      if (!res.ok) {
        setError(data.error ?? "mint_failed");
        return;
      }
      setRawKey(data.rawKey ?? null);
      router.refresh();
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-50">Mint owner key</h2>
      <p className="mt-2 text-sm text-slate-300">
        The raw key is shown once. Deliver it to the server owner through an out-of-band channel.
      </p>

      <form className="mt-6 space-y-4" onSubmit={mint}>
        <div>
          <label className="label" htmlFor="expiresInDays">
            Expires in (days)
          </label>
          <input
            id="expiresInDays"
            type="number"
            min={1}
            max={365}
            className="input"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label" htmlFor="preboundGuildId">
            Pre-bound guild ID (optional)
          </label>
          <input
            id="preboundGuildId"
            className="input"
            value={preboundGuildId}
            onChange={(e) => setPreboundGuildId(e.target.value)}
            placeholder="If set, redemption must use this exact guild id"
          />
        </div>
        <div>
          <label className="label" htmlFor="createdBySubject">
            Issuer subject (audit)
          </label>
          <input id="createdBySubject" className="input" value={createdBySubject} onChange={(e) => setCreatedBySubject(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
        {rawKey ? (
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            <p className="font-semibold">New key (copy now)</p>
            <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px] text-emerald-50">{rawKey}</pre>
          </div>
        ) : null}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Minting…" : "Mint key"}
        </button>
      </form>
    </div>
  );
}
