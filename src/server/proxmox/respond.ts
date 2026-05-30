import "server-only";

import { NextResponse } from "next/server";

import { ProxmoxError, type ProxmoxErrorKind } from "@/lib/proxmox/errors";

const STATUS_BY_KIND: Record<ProxmoxErrorKind, number> = {
  config: 503, // not configured yet
  auth: 401, // bad token / insufficient privileges
  tls: 502, // upstream cert problem
  network: 502, // upstream unreachable
  http: 502, // upstream non-2xx
  parse: 502, // upstream gibberish
};

/**
 * Turn any thrown value into a safe JSON error response.
 * Never leaks the token, raw upstream bodies, or stack traces to the client.
 */
export function proxmoxErrorResponse(err: unknown): NextResponse {
  if (err instanceof ProxmoxError) {
    return NextResponse.json(
      { error: err.toPayload() },
      { status: STATUS_BY_KIND[err.kind], headers: { "Cache-Control": "no-store" } }
    );
  }

  // Unexpected: log server-side, return a generic message.
  console.error("[proxmox] unexpected error:", err);
  return NextResponse.json(
    { error: { kind: "network", message: "Unexpected server error." } },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}
