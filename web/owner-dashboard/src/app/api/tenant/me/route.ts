import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = "oryx_tenant";

export async function GET() {
  const url = process.env.CONTROL_API_URL;
  if (!url) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const res = await fetch(`${url.replace(/\/$/, "")}/v1/tenant/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
