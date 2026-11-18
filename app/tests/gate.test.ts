import { describe, expect, it } from "vitest";
import { checkCredentials, createSession, safeEqual, verifySession } from "@/_lib/gate";

describe("password gate", () => {
  it("accepts the exact configured credentials", () => {
    expect(checkCredentials("studio", "correct horse", "studio", "correct horse")).toBe(true);
  });

  it("rejects a wrong password, wrong user, or both", () => {
    expect(checkCredentials("studio", "correct horse", "studio", "nope")).toBe(false);
    expect(checkCredentials("studio", "correct horse", "other", "correct horse")).toBe(false);
    expect(checkCredentials("studio", "correct horse", "other", "nope")).toBe(false);
  });

  it("never accepts empty configured credentials", () => {
    expect(checkCredentials("", "", "", "")).toBe(false);
    expect(checkCredentials("studio", "", "studio", "")).toBe(false);
  });

  it("compares strings of different lengths without matching", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("abc", "abc")).toBe(true);
  });
});

describe("session cookie", () => {
  it("verifies a fresh token", async () => {
    const token = await createSession("studio", "pw", 60);
    expect(await verifySession(token, "studio", "pw")).toBe(true);
  });

  it("rejects expired, tampered, foreign or missing tokens", async () => {
    const old = await createSession("studio", "pw", 60, 1_000);
    expect(await verifySession(old, "studio", "pw", 1_000 + 61_000)).toBe(false);
    const [expires, signature] = (await createSession("studio", "pw", 60)).split(".");
    expect(await verifySession(`${Number(expires) + 99999}.${signature}`, "studio", "pw")).toBe(false);
    expect(await verifySession(await createSession("studio", "pw", 60), "studio", "changed")).toBe(false);
    expect(await verifySession(undefined, "studio", "pw")).toBe(false);
    expect(await verifySession("garbage", "studio", "pw")).toBe(false);
  });
});
