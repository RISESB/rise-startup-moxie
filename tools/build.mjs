/**
 * Rebuilds curriculum/ and index.json from the Moxie Hub source of truth.
 *
 *   node tools/build.mjs [path-to-moxie-hub]      (default: ../moxie-hub)
 *
 * Everything in Moxie Hub's curriculum is carried over: week files (objectives, plan,
 * materials, facilitator notes, full slide outline, lesson walkthrough), every video
 * pick, links to the source decks and docs, the weekly articles, and the weekly AI
 * tools (their inputs and the exact task they run). The one thing stripped is the
 * Google account id on Drive links (the ?ouid=... query string).
 * Not carried over because they aren't text: the podcast audio files. The .docx sources
 * are skipped because the week files are already built from them.
 * skills/ is hand-written and only indexed here, never overwritten.
 */
import { createRequire } from "node:module";
import vm from "node:vm";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hub = resolve(process.argv[2] || join(root, "..", "moxie-hub"));
const src = join(hub, "content", "curriculum");
const matter = createRequire(join(hub, "package.json"))("gray-matter");

const pad = (n) => String(n).padStart(2, "0");
// Drive links keep their document id but lose the query string, which carries a Google account id.
const link = (u) => String(u ?? "").replace(/(https:\/\/docs\.google\.com\/[^\s?)"']+)\?[^\s)"']*/g, "$1");
const clean = (s) => link(String(s ?? "")).replace(/[ \t]+\n/g, "\n").trim();
const csv = (file) => {
  if (!existsSync(file)) return [];
  const rows = []; let row = [], cur = "", q = false;
  for (const ch of readFileSync(file, "utf8")) {
    if (q) { if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (ch !== "\r") cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || "").trim()])));
};
/** Source text of `function name(...) {...}`, found by matching braces outside strings. */
const fnSource = (code, name) => {
  const start = code.search(new RegExp(`function ${name}\\s*\\(`));
  if (start < 0) return "";
  let depth = 0, quote = null;
  for (let i = code.indexOf("{", start); i < code.length; i++) {
    const ch = code[i];
    if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return code.slice(start, i + 1);
  }
  return "";
};
const strip = (html) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&mdash;|—/g, "-").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

rmSync(join(root, "curriculum"), { recursive: true, force: true });
mkdirSync(join(root, "curriculum", "weeks"), { recursive: true });
mkdirSync(join(root, "curriculum", "articles"), { recursive: true });

mkdirSync(join(root, "curriculum", "tools"), { recursive: true });

// Weekly AI tools: each is an HTML page with inputs and one task prompt. Turn it into text.
const tools = [];
let coachVoice = "";
for (const t of csv(join(hub, "hub", "build", "tools.csv"))) {
  const file = join(hub, "hub", t["Local File"]);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  const name = t["Local File"].replace(/^tools\//, "").replace(/\.html$/, "");
  const leave = strip(/class="leave-with">([\s\S]*?)<\/p>/.exec(html)?.[1] || "");
  const inputs = [...html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>\s*(<(?:input|textarea)[^>]*placeholder="([^"]*)"|<select[\s\S]*?<\/select>)?/g)].map((m) => {
    const opts = m[2]?.startsWith("<select") ? [...m[2].matchAll(/<option[^>]*>([\s\S]*?)<\/option>/g)].map((o) => strip(o[1])) : null;
    return `- ${strip(m[1])}${opts ? ` (choices: ${opts.join(", ")})` : m[3] ? ` (e.g. ${m[3].replace(/^e\.g\.\s*/i, "")})` : ""}`;
  });
  // Run the page's own buildPrompt() with named placeholders to recover the exact task text.
  let task = "";
  try {
    const pre = /var MOXIE_PREAMBLE = (\[[\s\S]*?\]\.join\("\\n"\));/.exec(html)?.[1];
    // buildPrompt plus any helper functions it calls (some tools format inputs first).
    const main = fnSource(html, "buildPrompt");
    const helpers = [...new Set([...main.matchAll(/\b([A-Za-z_$][\w$]*)\(/g)].map((m) => m[1]))]
      .filter((n) => n !== "buildPrompt").map((n) => fnSource(html, n)).filter(Boolean);
    const fn = [...helpers, main].join("\n");
    const ctx = { out: "", v: new Proxy({}, { get: (_, k) => `[${String(k)}]` }) };
    vm.runInNewContext(`var MOXIE_PREAMBLE = ${pre}; ${fn}; out = buildPrompt(v); voice = MOXIE_PREAMBLE;`, ctx, { timeout: 1000 });
    coachVoice ||= ctx.voice;
    task = ctx.out.split("\n\n---\n\n").slice(1).join("\n\n---\n\n").trim();
  } catch (err) { console.warn(`could not extract task from ${name}: ${err.message}`); }
  writeFileSync(join(root, "curriculum", "tools", `${name}.md`),
    `# ${t.Label} (Week ${t.Week} tool)\n\n${leave}\n\n` +
    `In class this is a one-page AI tool students open in their own Claude account. RISE Coach can run the same task right in the chat: ask for the inputs below, then follow the task.\n\n` +
    `## Ask the student for\n${inputs.join("\n")}\n\n## The task\n${task}\n`);
  tools.push({ week: Number(t.Week), name: t.Label, description: leave, path: `curriculum/tools/${name}.md` });
}

const picks = csv(join(hub, "hub", "build", "video_picks.csv"));
const program = JSON.parse(readFileSync(join(src, "program.json"), "utf8"));
const unitOf = (w) => program.units.find((u) => u.weeks.includes(w));
const weeks = [];

for (const f of readdirSync(src).filter((f) => /^week-\d+\.md$/.test(f)).sort()) {
  const { data: d, content } = matter(readFileSync(join(src, f), "utf8"));
  const unit = unitOf(d.week);
  const title = d.subtitle ? `${d.title}: ${d.subtitle}` : d.title;
  const seen = new Set();
  const videos = [
    ...(d.slides || []).filter((s) => s.video?.url).map((s) => ({ ...s.video, where: `slide ${s.n}` })),
    ...picks.filter((p) => p.slot.startsWith(`week${pad(d.week)}-`)).map((p) => ({ ...p, where: p.slot.replace(/^week\d+-s/, "slide ") })),
  ].filter((v) => v.url && !seen.has(v.url) && seen.add(v.url))
   .map((v) => `- [${v.title}](${v.url}) (${[v.channel, v.length, v.where].filter(Boolean).join(", ")})${v.note ? ` - ${v.note}` : ""}`);
  const sources = [
    d.deck?.url && `- Slide deck: ${link(d.deck.url)}`,
    d.links?.plan && `- Lesson plan doc: ${link(d.links.plan)}`,
    d.links?.outline && `- Slide outline doc: ${link(d.links.outline)}`,
  ].filter(Boolean);
  const tool = tools.find((t) => t.week === d.week);
  const out = [
    `# Week ${d.week}: ${title}`,
    `Unit ${unit.number}: ${unit.title}`,
    d.guidingQuestion ? `**Guiding question:** ${clean(d.guidingQuestion)}` : "",
    d.weekMeta || d.duration ? `_When it last ran: ${[clean(d.weekMeta), d.duration].filter(Boolean).join(" · ")}. Dates are from a previous year; this year's calendar may differ._` : "",
    d.objectives?.length ? `## By the end of the week, students can\n${d.objectives.map((o) => `- ${o}`).join("\n")}` : "",
    d.lessonPlan?.length ? `## The week at a glance\n${d.lessonPlan.map((l) => `- **${l.block}:** ${l.detail}`).join("\n")}` : "",
    d.materials?.length ? `## Materials\n${d.materials.map((m) => `- ${m}`).join("\n")}` : "",
    tool ? `## This week's AI tool\n${tool.name}: ${tool.description} Open ${tool.path} to run it.` : "",
    d.facilitatorNotes ? `## Facilitator notes\n${clean(d.facilitatorNotes)}` : "",
    d.slides?.length ? `## Monday slide outline\n${d.slides.map((s) => `${s.n}. **${s.title}:** ${s.onSlide || ""}${s.image ? `\n   _Picture: ${s.image}_` : ""}`).join("\n")}` : "",
    videos.length ? `## Videos for this week\n${videos.join("\n")}` : "",
    d.podcast?.title ? `## Podcast\n${d.podcast.title}${d.podcast.notes ? `: ${d.podcast.notes}` : ""}${d.podcast.audioUrl ? ` (${d.podcast.audioUrl})` : ""}` : "",
    sources.length ? `## Source documents\n_Google Drive files. A student may need a facilitator to share them._\n${sources.join("\n")}` : "",
    `## Lesson walkthrough\n_Written as the facilitator's script for the classroom. Use it to know what was taught and how; don't read it back to students._\n\n${clean(content)}`,
  ].filter(Boolean).join("\n\n") + "\n";
  writeFileSync(join(root, "curriculum", "weeks", `week-${pad(d.week)}.md`), out);

  const entry = { week: d.week, unit: unit.number, title, question: clean(d.guidingQuestion), path: `curriculum/weeks/week-${pad(d.week)}.md` };
  const art = join(src, "articles", f);
  if (tool) entry.tool = tool.path;
  if (existsSync(art)) {
    const a = matter(readFileSync(art, "utf8"));
    writeFileSync(join(root, "curriculum", "articles", `week-${pad(d.week)}.md`), `# ${a.data.title}\n\n_${clean(a.data.dek)}_\n\n${clean(a.content)}\n`);
    entry.article = `curriculum/articles/week-${pad(d.week)}.md`;
  }
  weeks.push(entry);
}

// Program overview + the facilitation framework
writeFileSync(join(root, "curriculum", "overview.md"),
  `# ${program.title}\n\n${program.tagline}\n\n` +
  program.units.map((u) => `## Unit ${u.number}: ${u.title}\n${u.summary}\n\n${u.weeks.map((w) => { const e = weeks.find((x) => x.week === w); return `- Week ${w}: ${e.title}`; }).join("\n")}`).join("\n\n") + "\n");

const st = JSON.parse(readFileSync(join(src, "structure.json"), "utf8"));
const render = (v, depth = 0) => {
  if (v == null) return "";
  if (typeof v === "string") return clean(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? `- ${clean(x)}` : render(x, depth))).filter(Boolean).join("\n");
  const { type, eyebrow, heading, title, ...rest } = v;
  const head = heading || title;
  return [head ? `${"#".repeat(Math.min(depth + 2, 4))} ${head}` : "", ...Object.values(rest).map((x) => render(x, depth + 1))].filter(Boolean).join("\n\n");
};
writeFileSync(join(root, "curriculum", "how-we-teach.md"), `# ${st.title}\n\n${clean(st.lede)}\n\n${st.blocks.map((b) => render(b)).join("\n\n")}\n`);

// Skills: index every skills/<name>/SKILL.md by its frontmatter
const skills = [];
for (const name of readdirSync(join(root, "skills")).sort()) {
  const dir = join(root, "skills", name);
  if (!statSync(dir).isDirectory() || !existsSync(join(dir, "SKILL.md"))) continue;
  const { data } = matter(readFileSync(join(dir, "SKILL.md"), "utf8"));
  const files = [];
  const walk = (p) => readdirSync(p).sort().forEach((x) => (statSync(join(p, x)).isDirectory() ? walk(join(p, x)) : files.push(relative(root, join(p, x)))));
  walk(dir);
  skills.push({ name: data.name || name, description: clean(data.description), weeks: data.weeks || [], path: `skills/${name}/SKILL.md`, files });
}

writeFileSync(join(root, "index.json"), JSON.stringify({
  program: program.title,
  units: program.units.map((u) => ({ number: u.number, title: u.title, summary: u.summary, weeks: u.weeks })),
  weeks,
  docs: [
    { path: "curriculum/overview.md", title: "Program overview", description: "All five units and 36 weeks on one page." },
    { path: "curriculum/how-we-teach.md", title: "How we facilitate", description: "The teaching approach behind every week." },
  ],
  tools,
  voice: coachVoice,
  skills,
}, null, 1) + "\n");
console.log(`built ${weeks.length} weeks, ${weeks.filter((w) => w.article).length} articles, ${tools.length} tools, ${picks.length} video picks, ${skills.length} skills`);
