import { describe, expect, it } from "vitest";
import { canonicalize, canonicalChecksum } from "../src/utils/canonical.js";

describe("canonicalize (RFC 8785-lite)", () => {
  it("ordena las claves de objeto", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("ordena recursivamente", () => {
    expect(canonicalize({ outer: { z: 1, a: 2 }, alpha: 9 })).toBe(
      '{"alpha":9,"outer":{"a":2,"z":1}}'
    );
  });

  it("omite undefined igual que JSON.stringify", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("preserva orden de arrays", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("escapa strings de forma estándar", () => {
    expect(canonicalize('hello "world"')).toBe('"hello \\"world\\""');
  });

  it("rechaza NaN e Infinity", () => {
    expect(() => canonicalize(NaN)).toThrow();
    expect(() => canonicalize(Infinity)).toThrow();
  });

  it("acepta null, booleanos, números y strings", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(true)).toBe("true");
    expect(canonicalize(false)).toBe("false");
    expect(canonicalize(42)).toBe("42");
    expect(canonicalize("hola")).toBe('"hola"');
  });
});

describe("canonicalChecksum", () => {
  it("dos objetos lógicamente iguales producen el mismo checksum", async () => {
    const a = { x: 1, y: { z: [3, 2, 1] } };
    const b = { y: { z: [3, 2, 1] }, x: 1 };
    const cA = await canonicalChecksum(a);
    const cB = await canonicalChecksum(b);
    expect(cA).toBe(cB);
    expect(cA).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("diferentes valores producen checksums distintos", async () => {
    const a = await canonicalChecksum({ x: 1 });
    const b = await canonicalChecksum({ x: 2 });
    expect(a).not.toBe(b);
  });
});
