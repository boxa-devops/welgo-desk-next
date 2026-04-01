import { NextRequest } from "next/server";

const BACKEND =
  process.env.WELGO_DESK_BACKEND_URL || "http://localhost:8000";

export const runtime = "nodejs";

async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const search = req.nextUrl.search;
  const target = `${BACKEND}${path}${search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const backendRes = await fetch(target, {
    method: req.method,
    headers,
    body: req.body,
    // @ts-expect-error -- Node fetch supports duplex for streaming request bodies
    duplex: "half",
  });

  const responseHeaders = new Headers(backendRes.headers);
  responseHeaders.delete("content-encoding");

  return new Response(backendRes.body, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
