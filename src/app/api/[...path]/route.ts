import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
const COOKIE = "toko_session";
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (path.some((p) => p === ".." || p.includes("/") || p.includes("\\")))
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin)
      return NextResponse.json(
        { error: "Origin not allowed" },
        { status: 403 },
      );
  }
  const base =
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://toko-api.tarcloud.win/ai-tutor/api/v2"
      : "http://127.0.0.1:8080/ai-tutor/api/v2");
  const headers = new Headers();
  const type = request.headers.get("content-type");
  if (type) headers.set("Content-Type", type);
  if (request.headers.has("range"))
    headers.set("Range", request.headers.get("range")!);
  const token = request.cookies.get(COOKIE)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const joined = path.join("/");
  try {
    const response = await fetch(
      `${base.replace(/\/$/, "")}/${joined}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method)
          ? undefined
          : await request.arrayBuffer(),
        cache: "no-store",
        signal: AbortSignal.timeout(80000),
        redirect: "error",
      },
    );
    if (joined === "auth/login" && response.ok) {
      const data = await response.json();
      const out = NextResponse.json({ ok: true });
      out.cookies.set(COOKIE, data.token, {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: data.expires_in,
      });
      return out;
    }
    const out = new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
    for (const key of ["content-range", "accept-ranges"]) {
      const value = response.headers.get(key);
      if (value) out.headers.set(key, value);
    }
    if ((joined === "auth/logout" && response.ok) || response.status === 401)
      out.cookies.delete(COOKIE);
    return out;
  } catch {
    return NextResponse.json(
      { error: "เชื่อมต่อหลังบ้านไม่ได้ กรุณาลองอีกครั้ง" },
      { status: 502 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
