import "server-only";

import http from "node:http";
import https from "node:https";

import {
  ProxmoxError,
  classifyHttpStatus,
  classifyNodeErrorCode,
} from "@/lib/proxmox/errors";
import type {
  ClusterStatusItem,
  NodeNetworkIface,
  ProxmoxResource,
} from "@/lib/proxmox/types";

import { getProxmoxConfig } from "./env";

const DEFAULT_TIMEOUT_MS = 10_000;

/** Proxmox wraps every payload in `{ data: ... }`. */
interface ProxmoxEnvelope<T> {
  data: T;
}

/**
 * Issue an authenticated GET against the Proxmox API and return `data`.
 *
 * Uses Node's `http`/`https` directly (rather than `fetch`) so we can apply a
 * per-request `rejectUnauthorized` for self-signed certs without ever touching
 * global TLS state. Errors are normalized into `ProxmoxError`.
 */
function requestJson<T>(
  path: string,
  searchParams?: Record<string, string | number>
): Promise<T> {
  const cfg = getProxmoxConfig();
  const url = new URL(cfg.baseUrl + path);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, String(v));
    }
  }

  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;

  return new Promise<T>((resolve, reject) => {
    const req = lib.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: cfg.authHeader,
          Accept: "application/json",
        },
        timeout: DEFAULT_TIMEOUT_MS,
        ...(isHttps ? { rejectUnauthorized: cfg.rejectUnauthorized } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          const kind = classifyHttpStatus(status);
          if (kind) {
            reject(
              new ProxmoxError(kind, `Proxmox responded with ${status}.`, {
                status,
              })
            );
            return;
          }
          const body = Buffer.concat(chunks).toString("utf8");
          try {
            const json = JSON.parse(body) as ProxmoxEnvelope<T>;
            resolve(json.data);
          } catch {
            reject(
              new ProxmoxError("parse", "Proxmox returned a non-JSON response.")
            );
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(
        new ProxmoxError("network", "Proxmox request timed out.", {
          code: "ETIMEDOUT",
        })
      );
    });

    req.on("error", (err) => {
      if (err instanceof ProxmoxError) {
        reject(err);
        return;
      }
      const code = (err as NodeJS.ErrnoException).code;
      reject(
        new ProxmoxError(
          classifyNodeErrorCode(code),
          err.message || "Proxmox request failed.",
          { code }
        )
      );
    });

    req.end();
  });
}

export type GuestKind = "qemu" | "lxc";

/** Thin, typed wrapper over the Proxmox endpoints we read. */
export const proxmox = {
  getClusterResources: (): Promise<ProxmoxResource[]> =>
    requestJson<ProxmoxResource[]>("/cluster/resources"),

  getClusterStatus: (): Promise<ClusterStatusItem[]> =>
    requestJson<ClusterStatusItem[]>("/cluster/status"),

  getNodeNetworks: (node: string): Promise<NodeNetworkIface[]> =>
    requestJson<NodeNetworkIface[]>(
      `/nodes/${encodeURIComponent(node)}/network`,
      { type: "any" }
    ),

  getGuestConfig: (
    node: string,
    kind: GuestKind,
    vmid: number
  ): Promise<Record<string, unknown>> =>
    requestJson<Record<string, unknown>>(
      `/nodes/${encodeURIComponent(node)}/${kind}/${vmid}/config`
    ),

  getVersion: (): Promise<{ version: string; release: string }> =>
    requestJson<{ version: string; release: string }>("/version"),
};
