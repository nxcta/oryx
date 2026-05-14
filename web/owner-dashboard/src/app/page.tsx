import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center gap-10 px-6 py-16">
      <header className="glass rounded-2xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">Oryx / Owner</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
          Mission control for your Discord perimeter
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
          Redeem your access key, bind this console to your guild, and operate anti-nuke policy, incidents, and
          telemetry from a security-first surface.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn btn-primary" href="/login">
            Redeem access key
          </Link>
          <Link className="btn btn-ghost" href="/console">
            Open console
          </Link>
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { t: "Scoped access", d: "Keys are one-time, hashed at rest, and bind only your guild." },
          { t: "BFF session", d: "Sessions are first-party HttpOnly cookies issued by this console." },
          { t: "Ops-ready", d: "Designed to pair with the Oryx bot + control API in production." },
        ].map((x) => (
          <div key={x.t} className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold text-cyan-200">{x.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{x.d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
