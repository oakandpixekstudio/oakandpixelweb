import { describe, expect, it } from "vitest";
import { checkBasicAuth, parseBasicAuth, safeEqual } from "@/_lib/gate";

const header = (user: string, password: string) =>
  "Basic " + Buffer.from(`${user}:${password}`, "utf-8").toString("base64");

describe("password gate", () => {
  it("accepts the exact configured credentials", () => {
    expect(checkBasicAuth(header("studio", "correct horse"), "studio", "correct horse")).toBe(true);
  });

  it("rejects a wrong password, wrong user, or both", () => {
    expect(checkBasicAuth(header("studio", "nope"), "studio", "correct horse")).toBe(false);
    expect(checkBasicAuth(header("other", "correct horse"), "studio", "correct horse")).toBe(false);
    expect(checkBasicAuth(header("other", "nope"), "studio", "correct horse")).toBe(false);
  });

  it("rejects missing, malformed or non-Basic headers", () => {
    expect(checkBasicAuth(null, "studio", "pw")).toBe(false);
    expect(checkBasicAuth("Bearer abc", "studio", "pw")).toBe(false);
    expect(checkBasicAuth("Basic !!!not-base64!!!", "studio", "pw")).toBe(false);
    expect(checkBasicAuth("Basic " + Buffer.from("nocolon").toString("base64"), "studio", "pw")).toBe(false);
  });

  it("never accepts empty configured credentials", () => {
    expect(checkBasicAuth(header("", ""), "", "")).toBe(false);
    expect(checkBasicAuth(header("studio", ""), "studio", "")).toBe(false);
  });

  it("keeps colons and non-ASCII characters inside the password", () => {
    expect(parseBasicAuth(header("studio", "pa:ss wörd"))).toEqual({ user: "studio", password: "pa:ss wörd" });
    expect(checkBasicAuth(header("studio", "pa:ss wörd"), "studio", "pa:ss wörd")).toBe(true);
  });

  it("compares strings of different lengths without matching", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("abc", "abc")).toBe(true);
  });
});
