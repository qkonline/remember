// THE APP'S OWN FILE: how Remember's emails look. The core's mail makers (codes, the moved
// notice, team invites) build their words and hand them here for the page around them: the
// sprout logo, Instrument Sans (where the mail app loads web fonts; system fonts elsewhere), the
// greens of the app, a white card on a pale green page. Email HTML is old-fashioned on purpose:
// tables and inline styles, which every mail app reads.

import type { Ctx } from "../env";

const C = {
  page: "#f2f7ee",
  card: "#ffffff",
  line: "#e3e8e2",
  text: "#172119",
  muted: "#4f5c53",
  leaf: "#94d873",
  leafInk: "#173d0f",
  leafEdge: "#5aa143",
  tint: "#e6f6dc",
  deep: "#1f4a14",
};

const FONT =
  "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A paragraph of body text (already-escaped HTML in). */
export const para = (html: string, muted = false) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:${muted ? 14 : 16}px;line-height:1.55;color:${muted ? C.muted : C.text}">${html}</p>`;

/** The six digits of a code, one per box, like the app's code field. */
export function codeBoxes(code: string): string {
  const cells = [...code]
    .map(
      (d) =>
        `<td style="padding:0 3px"><div style="width:44px;height:54px;line-height:54px;text-align:center;border:1px solid ${C.line};border-radius:12px;background:${C.card};font-family:${FONT};font-size:26px;font-weight:600;color:${C.text}">${esc(d)}</div></td>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr>${cells}</tr></table>`;
}

/** Remember's raised green key, as a link. */
export function button(href: string, label: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr><td style="border-radius:14px;background:${C.leaf};box-shadow:0 3px 0 ${C.leafEdge}">` +
    `<a href="${esc(href)}" style="display:inline-block;padding:14px 22px;font-family:${FONT};font-size:16px;font-weight:600;color:${C.leafInk};text-decoration:none;border-radius:14px">${esc(label)}</a>` +
    `</td></tr></table>`
  );
}

/**
 * The whole email: a hidden preview line (what mail apps show after the subject), the logo and
 * name, a heading, the body, and a quiet footer with the app's address.
 */
export function page(
  ctx: Ctx,
  o: { preheader: string; heading: string; body: string },
): string {
  const app = esc(ctx.cfg.title);
  const home = ctx.cfg.appUrl;
  const logo = `${home}/icons/icon-192.png`;
  const site = home.replace(/^https?:\/\//, "");
  return `<!doctype html>
<html lang="${esc(ctx.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${app}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}">
<tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
    <tr><td style="padding:0 4px 18px">
      <a href="${esc(home)}" style="text-decoration:none">
        <img src="${esc(logo)}" width="32" height="32" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:9px">
        <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-family:${FONT};font-size:18px;font-weight:600;color:${C.text}">${app}</span>
      </a>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:20px;padding:28px 28px 12px">
      <h1 style="margin:0 0 14px;font-family:${FONT};font-size:22px;line-height:1.25;font-weight:600;color:${C.text}">${esc(o.heading)}</h1>
      ${o.body}
    </td></tr>
    <tr><td style="padding:18px 4px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted}">
      <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${C.leaf};margin-right:6px"></span>${app} · <a href="${esc(home)}" style="color:${C.deep};text-decoration:none">${esc(site)}</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
