import { describe, expect, it } from "vitest";
import { parseCsv } from "../csv";

describe("parseCsv", () => {
  it("parses quoted commas", () => {
    const { headers, rows } = parseCsv('name,note\n"Acme, Inc",ok');
    expect(headers).toEqual(["name", "note"]);
    expect(rows).toEqual([["Acme, Inc", "ok"]]);
  });

  it("keeps an embedded newline inside quotes", () => {
    const { rows } = parseCsv('name,note\n"line 1\nline 2",ok');
    expect(rows).toEqual([["line 1\nline 2", "ok"]]);
  });

  it("unescapes doubled quotes", () => {
    const { rows } = parseCsv('name,note\n"she said ""hi""",ok');
    expect(rows).toEqual([['she said "hi"', "ok"]]);
  });

  it("strips a leading UTF-8 BOM", () => {
    const { headers, rows } = parseCsv("\uFEFFname,email\nAda,ada@example.com");
    expect(headers).toEqual(["name", "email"]);
    expect(rows).toEqual([["Ada", "ada@example.com"]]);
  });

  it("pads ragged short rows rather than throwing", () => {
    const { headers, rows } = parseCsv("a,b,c\n1,2\n3,4,5,6");
    expect(headers).toEqual(["a", "b", "c"]);
    expect(rows[0]).toEqual(["1", "2", ""]);
    expect(rows[1]).toEqual(["3", "4", "5", "6"]);
  });

  it("returns zero data rows for a header-only file", () => {
    const parsed = parseCsv("a,b,c\n");
    expect(parsed.headers).toEqual(["a", "b", "c"]);
    expect(parsed.rows).toEqual([]);
  });
});
