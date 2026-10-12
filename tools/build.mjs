/**
 * Rebuilds curriculum/ and index.json from the Moxie Hub source of truth.
 *
 *   node tools/build.mjs [path-to-moxie-hub]      (default: ../moxie-hub)
 *
 * What gets left out on purpose, because this repo is public:
 *   - Google Doc/Slides links (they carry a Google account id and aren't shared publicly)
 *   - facilitatorNotes and last year's class dates
 * skills/ is hand-written and only indexed here, never overwritten.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hub = resolve(process.argv[2] || join(root, "..", "moxie-hub"));
const src = join(hub, "content", "curriculum");
const matter = createRequire(join(hub, "package.json"))("gray-matter");

const pad = (n) => String(n).padStart(2, "0");
const clean = (s) => String(s ?? "").replace(/https:\/\/docs\.google\.com\/\S+/g, "").replace(/[ \t]+\n/g, "\n").trim();

rmSync(join(root, "curriculum"), { recursive: true, force: true });
mkdirSync(join(root, "curriculum", "weeks"), { recursive: true });
mkdirSync(join(root, "curriculum", "articles"), { recursive: true });

const program = JSON.parse(readFileSync(join(src, "program.json"), "utf8"));
const unitOf = (w) => program.units.find((u) => u.weeks.includes(w));
const weeks = [];

for (const f of readdirSync(src).filter((f) => /^week-\d+\.md$/.test(f)).sort()) {
  const { data: d, content } = matter(readFileSync(join(src, f), "utf8"));
  const unit = unitOf(d.week);
  const title = d.subtitle ? `${d.title}: ${d.subtitle}` : d.title;
  const videos = (d.slides || []).filter((s) => s.video?.url).map((s) => `- [${s.video.title}](${s.video.url})${s.video.channel ? ` (${s.video.channel}${s.video.length ? ", " + s.video.length : ""})` : ""}`);
  const out = [
    `# Week ${d.week}: ${title}`,
    `Unit ${unit.number}: ${unit.title}`,
    d.guidingQuestion ? `**Guiding question:** ${clean(d.guidingQuestion)}` : "",
    d.objectives?.length ? `## By the end of the week, students can\n${d.objectives.map((o) => `- ${o}`).join("\n")}` : "",
    d.lessonPlan?.length ? `## The week at a glance\n${d.lessonPlan.map((l) => `- **${l.block}:** ${l.detail}`).join("\n")}` : "",
    d.materials?.length ? `## Materials\n${d.materials.map((m) => `- ${m}`).join("\n")}` : "",
    d.slides?.length ? `## Key ideas (from the slides)\n${d.slides.filter((s) => s.onSlide).map((s) => `- **${s.title}:** ${s.onSlide}`).join("\n")}` : "",
    videos.length ? `## Videos used this week\n${videos.join("\n")}` : "",
    `## Lesson walkthrough\n_Written as the facilitator's script for the classroom. Use it to know what was taught and how; don't read it back to students._\n\n${clean(content)}`,
  ].filter(Boolean).join("\n\n") + "\n";
  writeFileSync(join(root, "curriculum", "weeks", `week-${pad(d.week)}.md`), out);

  const entry = { week: d.week, unit: unit.number, title, question: clean(d.guidingQuestion), path: `curriculum/weeks/week-${pad(d.week)}.md` };
  const art = join(src, "articles", f);
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
  skills,
}, null, 1) + "\n");
console.log(`built ${weeks.length} weeks, ${weeks.filter((w) => w.article).length} articles, ${skills.length} skills`);
