import "server-only";

import { ProxmoxError } from "@/lib/proxmox/errors";

/**
 * Server-side Proxmox configuration, derived from environment variables.
 *
 * `import "server-only"` guarantees a build error if this module is ever pulled
 * into a client bundle — the token must never reach the browser.
 */
export interface ProxmoxConfig {
  /** Fully-qualified API base, e.g. "https://pve.lan:8006/api2/json". */
  baseUrl: string;
  /** `Authorization` header value (`PVEAPIToken=user@realm!id=secret`). */
  authHeader: string;
  /** Whether to verify the TLS certificate (false allows self-signed). */
  rejectUnauthorized: boolean;
  /** TTL for the cheap inventory poll. */
  cacheTtlMs: number;
}

let cached: ProxmoxConfig | null = null;

export function isProxmoxConfigured(): boolean {
  return Boolean(
    process.env.PROXMOX_HOST &&
      process.env.PROXMOX_TOKEN_ID &&
      process.env.PROXMOX_TOKEN_SECRET
  );
}

export function getProxmoxConfig(): ProxmoxConfig {
  if (cached) return cached;

  const host = process.env.PROXMOX_HOST?.trim();
  const tokenId = process.env.PROXMOX_TOKEN_ID?.trim();
  const tokenSecret = process.env.PROXMOX_TOKEN_SECRET?.trim();

  if (!host || !tokenId || !tokenSecret) {
    throw new ProxmoxError(
      "config",
      "Proxmox connection is not configured on the server."
    );
  }

  // Normalize: ensure a protocol, drop trailing slashes, append the API base.
  let root = host.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(root)) root = `https://${root}`;
  const baseUrl = root.endsWith("/api2/json") ? root : `${root}/api2/json`;

  const rejectUnauthorized =
    process.env.PROXMOX_TLS_REJECT_UNAUTHORIZED !== "false";
  const cacheTtlMs = Number(process.env.PROXMOX_CACHE_TTL_MS) || 4000;

  cached = {
    baseUrl,
    authHeader: `PVEAPIToken=${tokenId}=${tokenSecret}`,
    rejectUnauthorized,
    cacheTtlMs,
  };
  return cached;
}
