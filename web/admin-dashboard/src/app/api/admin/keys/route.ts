import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.CONTROL_API_URL;
  const token = process.env.ADMIN_API_TOKEN;
  if (!base || !token) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/internal/v1/keys`, {
    headers: { "x-admin-token": token },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: Request) {
  const base = process.env.CONTROL_API_URL;
  const token = process.env.ADMIN_API_TOKEN;
  if (!base || !token) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const res = await fetch(`${base.replace(/\/$/, "")}/internal/v1/keys`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
