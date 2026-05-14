import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = "oryx_tenant";

export async function POST() {
  const url = process.env.CONTROL_API_URL;
  if (!url) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) {
    await fetch(`${url.replace(/\/$/, "")}/v1/tenant/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}
