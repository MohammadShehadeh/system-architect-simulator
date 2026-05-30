import { describe, expect, it } from "vitest";

import {
  ProxmoxError,
  classifyHttpStatus,
  classifyNodeErrorCode,
  remediationFor,
  type ProxmoxErrorKind,
} from "@/lib/proxmox/errors";

describe("classifyHttpStatus", () => {
  it("returns null for 2xx", () => {
    expect(classifyHttpStatus(200)).toBeNull();
    expect(classifyHttpStatus(204)).toBeNull();
  });
  it("maps 401/403 to auth", () => {
    expect(classifyHttpStatus(401)).toBe("auth");
    expect(classifyHttpStatus(403)).toBe("auth");
  });
  it("maps other non-2xx to http", () => {
    expect(classifyHttpStatus(500)).toBe("http");
    expect(classifyHttpStatus(404)).toBe("http");
  });
});

describe("classifyNodeErrorCode", () => {
  it("treats certificate errors as tls", () => {
    expect(classifyNodeErrorCode("DEPTH_ZERO_SELF_SIGNED_CERT")).toBe("tls");
    expect(classifyNodeErrorCode("SELF_SIGNED_CERT_IN_CHAIN")).toBe("tls");
    expect(classifyNodeErrorCode("UNABLE_TO_VERIFY_LEAF_SIGNATURE")).toBe("tls");
  });
  it("treats connection errors as network", () => {
    expect(classifyNodeErrorCode("ECONNREFUSED")).toBe("network");
    expect(classifyNodeErrorCode(undefined)).toBe("network");
  });
});

describe("ProxmoxError", () => {
  it("serializes to a browser-safe payload", () => {
    const err = new ProxmoxError("auth", "bad token", { status: 401 });
    expect(err.toPayload()).toEqual({
      kind: "auth",
      message: "bad token",
      status: 401,
    });
  });
});

describe("remediationFor", () => {
  it("returns a non-empty hint for every kind", () => {
    const kinds: ProxmoxErrorKind[] = [
      "config",
      "auth",
      "tls",
      "network",
      "http",
      "parse",
    ];
    for (const k of kinds) expect(remediationFor(k).length).toBeGreaterThan(0);
  });
});
