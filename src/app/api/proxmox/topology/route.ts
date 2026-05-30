import { NextResponse } from "next/server";

import { getTopology } from "@/server/proxmox/service";
import { proxmoxErrorResponse } from "@/server/proxmox/respond";

// Needs the Node runtime for the https.Agent / TLS control, and must run at
// request time (live data, never prerendered or cached by the framework).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const topology = await getTopology();
    return NextResponse.json(topology, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return proxmoxErrorResponse(err);
  }
}
