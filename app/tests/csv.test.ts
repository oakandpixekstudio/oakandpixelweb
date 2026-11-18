import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/_lib/csv";

describe("csv", () => {
  it("round-trips quotes, commas and line breaks", () => {
    const text = toCsv(["name", "note"], [["Acme, Inc", 'He said "hi"'], ["B", "line1\nline2"]]);
    expect(parseCsv(text)).toEqual([["name", "note"], ["Acme, Inc", 'He said "hi"'], ["B", "line1\nline2"]]);
  });
  it("reads Windows line endings, a BOM and skips blank lines", () => {
    expect(parseCsv("\uFEFFname,email\r\nA,a@x.co\r\n\r\nB,b@x.co\r\n")).toEqual([["name", "email"], ["A", "a@x.co"], ["B", "b@x.co"]]);
  });
  it("defuses spreadsheet formulas on export", () => {
    expect(toCsv(["x"], [["=HYPERLINK(\"http://evil\")"], ["+1"], ["@SUM(A1)"], ["fine"]]).split("\r\n").slice(1)).toEqual(["\"'=HYPERLINK(\"\"http://evil\"\")\"", "'+1", "'@SUM(A1)", "fine"]);
  });
});
