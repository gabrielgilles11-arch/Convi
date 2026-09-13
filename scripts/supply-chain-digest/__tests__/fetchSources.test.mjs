import { describe, it, expect } from "vitest";
import { parseFeed, parseFederalRegister } from "../fetchSources.mjs";

const RSS_SAMPLE = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Test feed</title>
  <item>
    <title>China curbs rare earth exports</title>
    <link>https://example.com/a</link>
    <description>Beijing tightens &lt;b&gt;export quotas&lt;/b&gt; on rare earths.</description>
    <pubDate>Sun, 13 Sep 2026 06:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const ATOM_SAMPLE = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>EU weighs tariff on Chinese lithium imports</title>
    <link href="https://example.com/b" />
    <summary>The Commission is reviewing options.</summary>
    <published>2026-09-13T05:00:00Z</published>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("parses RSS 2.0 items and strips HTML from the description", () => {
    const items = parseFeed(RSS_SAMPLE);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("China curbs rare earth exports");
    expect(items[0].link).toBe("https://example.com/a");
    expect(items[0].summary).toContain("export quotas");
    expect(items[0].summary).not.toContain("<b>");
    expect(items[0].publishedAt).toBeInstanceOf(Date);
  });

  it("parses Atom entries with an href-style link", () => {
    const items = parseFeed(ATOM_SAMPLE);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("EU weighs tariff on Chinese lithium imports");
    expect(items[0].link).toBe("https://example.com/b");
  });

  it("returns an empty list for a feed with no items", () => {
    expect(parseFeed(`<rss version="2.0"><channel></channel></rss>`)).toEqual([]);
  });
});

describe("parseFederalRegister", () => {
  it("maps the documents.json shape to normalized items", () => {
    const items = parseFederalRegister({
      results: [
        {
          title: "2026 List of Critical Minerals",
          html_url: "https://www.federalregister.gov/documents/x",
          abstract: "The Secretary finalizes the list.",
          publication_date: "2026-09-12",
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("2026 List of Critical Minerals");
    expect(items[0].publishedAt.getUTCFullYear()).toBe(2026);
  });

  it("handles a response with no results", () => {
    expect(parseFederalRegister({})).toEqual([]);
  });
});
