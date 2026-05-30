import { NextResponse } from "next/server";

import { getHealth } from "@/server/proxmox/service";
import { proxmoxErrorResponse } from "@/server/proxmox/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await getHealth();
    return NextResponse.json(health, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return proxmoxErrorResponse(err);
  }
}
