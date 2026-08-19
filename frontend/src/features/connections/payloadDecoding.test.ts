import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToText, detectConfluentAvro, tryParseJson } from "./payloadDecoding";

function toBase64(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes));
}

describe("base64ToBytes / bytesToText", () => {
  it("round-trips plain text through base64", () => {
    const original = "hello world";
    const b64 = btoa(original);
    expect(bytesToText(base64ToBytes(b64))).toBe(original);
  });

  it("decodes UTF-8 multi-byte characters correctly", () => {
    const original = "héllo wörld 日本語";
    const bytes = Array.from(new TextEncoder().encode(original));
    expect(bytesToText(base64ToBytes(toBase64(bytes)))).toBe(original);
  });
});

describe("tryParseJson", () => {
  it("parses valid JSON into a value", () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns undefined for invalid JSON", () => {
    expect(tryParseJson("not json")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(tryParseJson("")).toBeUndefined();
  });
});

describe("detectConfluentAvro", () => {
  it("detects the Confluent wire format (magic byte 0 + 4-byte big-endian schema id)", () => {
    // magic byte 0x00, schema id 42 as 4-byte big-endian, then arbitrary avro body
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x2a, 0xde, 0xad, 0xbe, 0xef]);
    expect(detectConfluentAvro(bytes)).toEqual({ schemaId: 42 });
  });

  it("returns null when the magic byte is not 0", () => {
    const bytes = new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x2a]);
    expect(detectConfluentAvro(bytes)).toBeNull();
  });

  it("returns null for payloads too short to contain a schema id", () => {
    expect(detectConfluentAvro(new Uint8Array([0x00, 0x01]))).toBeNull();
  });

  it("returns null for an empty payload", () => {
    expect(detectConfluentAvro(new Uint8Array([]))).toBeNull();
  });
});
