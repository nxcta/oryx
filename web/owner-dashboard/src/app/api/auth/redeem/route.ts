import { NextResponse } from "next/server";

const COOKIE = "oryx_tenant";

export async function POST(req: Request) {
  const url = process.env.CONTROL_API_URL;
  const secret = process.env.BFF_SERVER_SECRET;
  if (!url || !secret) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const body = (await req.json()) as { rawKey?: string; guildId?: string; discordUserId?: string };
  const res = await fetch(`${url.replace(/\/$/, "")}/v1/bff/redeem`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-oryx-bff-secret": secret,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as { error?: string; sessionToken?: string; guildId?: string; expiresAt?: string };
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  if (!data.sessionToken) {
    return NextResponse.json({ error: "missing_session_token" }, { status: 502 });
  }

  const out = NextResponse.json({ ok: true, guildId: data.guildId, expiresAt: data.expiresAt });
  out.cookies.set(COOKIE, data.sessionToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return out;
}
