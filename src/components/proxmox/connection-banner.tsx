"use client";

import { AlertTriangle, CircleCheck, Loader2 } from "lucide-react";

import { remediationFor } from "@/lib/proxmox/errors";
import { useProxmoxStore } from "@/lib/store/proxmox-store";
import { Badge } from "@/components/ui/badge";

export function ConnectionBanner() {
  const status = useProxmoxStore((s) => s.status);
  const error = useProxmoxStore((s) => s.error);
  const meta = useProxmoxStore((s) => s.topology?.meta ?? null);

  if (status === "error" && error) {
    return (
      <div
        data-testid="proxmox-banner-error"
        className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <span className="font-semibold capitalize">{error.kind} error</span>
          <span className="mx-1.5 opacity-50">·</span>
          <span>{error.message}</span>
          <div className="mt-0.5 text-destructive/80">
            {remediationFor(error.kind)}
          </div>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Connecting to Proxmox…
      </div>
    );
  }

  return (
    <div
      data-testid="proxmox-banner-ok"
      className="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <CircleCheck className="size-3.5 text-emerald-500" />
      <span className="font-medium text-foreground">{meta.clusterName}</span>
      <Badge
        variant={meta.quorate ? "secondary" : "destructive"}
        className="h-4 px-1.5 text-[10px]"
      >
        {meta.quorate ? "quorate" : "no quorum"}
      </Badge>
      <span>
        {meta.nodeCount} node{meta.nodeCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
