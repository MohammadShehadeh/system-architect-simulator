/**
 * Typed, browser-safe Proxmox error model + pure classifiers.
 *
 * No Node imports here so the classifiers can be unit-tested directly and the
 * error *shape* can be shared with the client (the store renders `kind`).
 */

export type ProxmoxErrorKind =
  | "config" // missing/invalid environment configuration
  | "auth" // 401/403 — bad token or insufficient privileges
  | "tls" // certificate verification failed (self-signed)
  | "network" // DNS/connection/timeout
  | "http" // other non-2xx response
  | "parse"; // unexpected/non-JSON body

/** Serializable error returned to the browser — never contains the token. */
export interface ProxmoxErrorPayload {
  kind: ProxmoxErrorKind;
  message: string;
  status?: number;
}

export class ProxmoxError extends Error {
  readonly kind: ProxmoxErrorKind;
  readonly status?: number;
  /** Underlying Node error code (e.g. "ECONNREFUSED"), for logging only. */
  readonly code?: string;

  constructor(
    kind: ProxmoxErrorKind,
    message: string,
    opts: { status?: number; code?: string } = {}
  ) {
    super(message);
    this.name = "ProxmoxError";
    this.kind = kind;
    this.status = opts.status;
    this.code = opts.code;
  }

  toPayload(): ProxmoxErrorPayload {
    return { kind: this.kind, message: this.message, status: this.status };
  }
}

/** Map an HTTP status to an error kind. Returns null for 2xx. */
export function classifyHttpStatus(status: number): ProxmoxErrorKind | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) return "auth";
  return "http";
}

/** Node TLS/connection error codes that mean "certificate couldn't be verified". */
const TLS_CODE_RE =
  /CERT|SSL|SELF_SIGNED|UNABLE_TO_VERIFY|CERT_HAS_EXPIRED|HOSTNAME/i;

/** Classify a Node socket error code into a tls/network kind. */
export function classifyNodeErrorCode(code: string | undefined): ProxmoxErrorKind {
  if (code && TLS_CODE_RE.test(code)) return "tls";
  return "network";
}

/** Human-friendly, non-leaky hint shown in the connection banner. */
export function remediationFor(kind: ProxmoxErrorKind): string {
  switch (kind) {
    case "config":
      return "Set PROXMOX_HOST, PROXMOX_TOKEN_ID and PROXMOX_TOKEN_SECRET, then restart the server.";
    case "auth":
      return "Check the API token id/secret and that it has the PVEAuditor role at path /.";
    case "tls":
      return "The Proxmox certificate could not be verified. For a self-signed cert on a trusted network, set PROXMOX_TLS_REJECT_UNAUTHORIZED=false.";
    case "network":
      return "Could not reach the Proxmox host. Verify PROXMOX_HOST, the port (8006), and network access.";
    case "http":
      return "Proxmox returned an unexpected response. Check the host URL and API path.";
    case "parse":
      return "Proxmox returned an unexpected (non-JSON) response.";
  }
}
