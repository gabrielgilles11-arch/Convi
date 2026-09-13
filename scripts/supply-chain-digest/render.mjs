/** Builds the digest email. Plain enough to read as text; no template engine needed for one screen. */

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function tagLabel(tags) {
  if (tags.includes("minerals") && tags.includes("friction")) return "minerals + friction";
  if (tags.includes("minerals")) return "minerals";
  if (tags.includes("friction")) return "friction";
  return "";
}

export function buildDigestHtml({ dateLabel, ranked, health }) {
  const rows = ranked
    .map(
      ({ item, scored }) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#666">
            ${escapeHtml(item.sourceName)} · score ${scored.total} · ${escapeHtml(tagLabel(scored.tags))}
          </div>
          <div style="font-size:16px;font-weight:600;margin:4px 0">
            <a href="${escapeHtml(item.link)}" style="color:#111;text-decoration:none">${escapeHtml(item.title)}</a>
          </div>
          <div style="font-size:13px;color:#444">${escapeHtml((item.summary ?? "").slice(0, 240))}</div>
          <div style="font-size:11px;color:#999;margin-top:4px">
            minerals ${scored.mineral}/4 · friction ${scored.friction}/4 · source ${scored.authority}/3 ·
            recency ${scored.recency}/2 · magnitude ${scored.magnitude}/2
          </div>
        </td>
      </tr>`,
    )
    .join("");

  const healthLine = health
    .map((h) => `${h.ok ? "✓" : "✗"} ${escapeHtml(h.name)}${h.ok ? ` (${h.count})` : ` — ${escapeHtml(h.error ?? "failed")}`}`)
    .join(" &nbsp;·&nbsp; ");

  const body =
    ranked.length > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
      : `<p style="color:#555">No developments crossed the threshold today.</p>`;

  return `<!doctype html>
<html>
  <body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px 16px;color:#111">
    <h1 style="font-size:20px;margin:0 0 4px">Mineral supply chain & transatlantic friction — ${escapeHtml(dateLabel)}</h1>
    <p style="font-size:13px;color:#666;margin:0 0 20px">Ranked by the rubric: mineral relevance, friction relevance, source authority, recency, magnitude.</p>
    ${body}
    <p style="font-size:11px;color:#999;margin-top:24px;border-top:1px solid #e5e5e5;padding-top:12px">
      Source health: ${healthLine}
    </p>
  </body>
</html>`;
}

export function buildDigestText({ dateLabel, ranked, health }) {
  const lines = [`Mineral supply chain & transatlantic friction — ${dateLabel}`, ""];

  if (ranked.length === 0) {
    lines.push("No developments crossed the threshold today.");
  } else {
    for (const { item, scored } of ranked) {
      lines.push(`[${scored.total}] ${tagLabel(scored.tags)} · ${item.sourceName}`);
      lines.push(item.title);
      lines.push(item.link);
      if (item.summary) lines.push(item.summary.slice(0, 240));
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(
    "Sources: " +
      health.map((h) => `${h.ok ? "OK" : "FAIL"} ${h.name}${h.ok ? ` (${h.count})` : ` — ${h.error ?? "failed"}`}`).join(" | "),
  );

  return lines.join("\n");
}
