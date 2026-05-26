import { describe, expect, it } from "vitest";

import {
  cloneTemplate,
  TEMPLATES,
  TEMPLATES_BY_ID,
  TEMPLATE_CATEGORIES,
} from "@/lib/architecture/templates";

describe("templates", () => {
  it("exposes at least one template", () => {
    expect(TEMPLATES.length).toBeGreaterThan(0);
  });

  it("has unique template ids", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("indexes every template in TEMPLATES_BY_ID", () => {
    for (const t of TEMPLATES) {
      expect(TEMPLATES_BY_ID[t.id]).toBe(t);
    }
  });

  it("only uses declared categories", () => {
    const allowed = new Set(TEMPLATE_CATEGORIES.map((c) => c.id));
    for (const t of TEMPLATES) {
      expect(
        allowed.has(t.category),
        `template ${t.id} category ${t.category}`
      ).toBe(true);
    }
  });

  it("has structurally valid edges (every edge references a real node)", () => {
    for (const t of TEMPLATES) {
      const ids = new Set(t.nodes.map((n) => n.id));
      for (const e of t.edges) {
        expect(ids.has(e.source), `${t.id}: edge source ${e.source}`).toBe(true);
        expect(ids.has(e.target), `${t.id}: edge target ${e.target}`).toBe(true);
      }
    }
  });
});

describe("cloneTemplate", () => {
  it("produces fresh ids while preserving edge topology", () => {
    const template = TEMPLATES[0];
    const { nodes, edges } = cloneTemplate(template);

    expect(nodes).toHaveLength(template.nodes.length);
    expect(edges).toHaveLength(template.edges.length);

    const originalIds = new Set(template.nodes.map((n) => n.id));
    for (const n of nodes) {
      expect(originalIds.has(n.id), `${n.id} should be fresh`).toBe(false);
    }

    const newIds = new Set(nodes.map((n) => n.id));
    for (const e of edges) {
      expect(newIds.has(e.source)).toBe(true);
      expect(newIds.has(e.target)).toBe(true);
    }
  });

  it("does not share node data references with the original", () => {
    const template = TEMPLATES[0];
    const { nodes } = cloneTemplate(template);
    for (let i = 0; i < nodes.length; i++) {
      expect(nodes[i].data).not.toBe(template.nodes[i].data);
      expect(nodes[i].data.config).not.toBe(template.nodes[i].data.config);
    }
  });

  it("yields disjoint ids across two consecutive clones", () => {
    const template = TEMPLATES[0];
    const a = cloneTemplate(template);
    const b = cloneTemplate(template);
    const aIds = new Set(a.nodes.map((n) => n.id));
    for (const n of b.nodes) {
      expect(aIds.has(n.id), `dupe id across clones: ${n.id}`).toBe(false);
    }
  });
});
