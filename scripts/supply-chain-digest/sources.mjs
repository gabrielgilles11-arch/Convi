/**
 * The curated source list. `authority` feeds straight into the rubric:
 * 3 = official/regulatory, 2 = think tank, 1 = general-news proxy.
 *
 * Two of the beats named on the brief — China customs releases and EU
 * Commission press pages — don't publish a feed that can be hardcoded
 * reliably, so they're covered by targeted Google News queries instead.
 * Everything else is a native feed or API.
 *
 * A source URL going stale (a site reshuffles its RSS path) fails that one
 * source, not the run: see fetchSources.mjs, which reports per-source health
 * rather than throwing.
 */
export const SOURCES = [
  {
    id: "federal-register-critical-minerals",
    name: "Federal Register — critical minerals",
    type: "federal-register",
    url: "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=critical+minerals&order=newest&per_page=20",
    authority: 3,
  },
  {
    id: "federal-register-defense-procurement",
    name: "Federal Register — defense procurement",
    type: "federal-register",
    url: "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bagencies%5D%5B%5D=defense-department&conditions%5Bterm%5D=procurement&order=newest&per_page=20",
    authority: 3,
  },
  {
    id: "csis-analysis",
    name: "CSIS — analysis",
    type: "rss",
    url: "https://www.csis.org/analysis/rss.xml",
    authority: 2,
  },
  {
    id: "gzero-eurasia-group",
    name: "GZERO Media (Eurasia Group)",
    type: "rss",
    url: "https://www.gzeromedia.com/feed",
    authority: 2,
  },
  {
    id: "eu-china-customs-proxy",
    name: "China customs data (news proxy)",
    type: "rss",
    url: "https://news.google.com/rss/search?q=%22China+customs%22+(exports+OR+imports+OR+minerals+OR+rare+earth)+when:3d&hl=en-US&gl=US&ceid=US:en",
    authority: 1,
  },
  {
    id: "eu-commission-trade-proxy",
    name: "EU Commission trade & minerals (news proxy)",
    type: "rss",
    url: "https://news.google.com/rss/search?q=(%22European+Commission%22+OR+%22EU+Commission%22)+(tariff+OR+%22export+control%22+OR+CBAM+OR+%22critical+raw+materials%22)+when:3d&hl=en-US&gl=US&ceid=US:en",
    authority: 1,
  },
];
