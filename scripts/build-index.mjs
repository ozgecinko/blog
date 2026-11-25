// Builds posts/index.json from posts/*.md, concepts/*.md and series.yml.
// No dependencies, runs on Node 20 (GitHub Actions).
//
// Post file:  posts/YYYY-MM-DD-slug.md  →  ozgecinko.com/logs/slug
// Frontmatter (all optional except title):
//   title, date (falls back to the file name), series, part, summary, tags, draft,
//   lang (en | tr, default en), translation (slug of the same post in the other language)
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const read = (p) => readFileSync(p, "utf8");
const list = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : [];

// --- tiny frontmatter parser: `key: value`, `key: [a, b]`, quotes optional
function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^(\w+):\s*(.*?)\s*(?:#.*)?$/);
      if (!kv) continue;
      let v = kv[2];
      if (v.startsWith("[") && v.endsWith("]"))
        v = v
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      else v = v.replace(/^["']|["']$/g, "");
      if (v === "true") v = true;
      if (v === "false") v = false;
      meta[kv[1]] = v;
    }
  }
  return { meta, body: m ? text.slice(m[0].length) : text };
}

// --- series.yml: two-level `key:` / `  field: value`
function parseSeries(text) {
  const out = {};
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(line)) continue;
    const top = line.match(/^([\w-]+):\s*$/);
    const sub = line.match(/^\s+(\w+):\s*(.*?)\s*(?:#.*)?$/);
    if (top) out[(cur = top[1])] = {};
    else if (sub && cur)
      out[cur][sub[1]] =
        isNaN(sub[2]) || sub[2] === ""
          ? sub[2].replace(/^["']|["']$/g, "")
          : Number(sub[2]);
  }
  return out;
}

const plain = (md) =>
  md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a)
    .replace(/[#*_`>\[\]()!-]/g, " ");
const words = (md) => plain(md).split(/\s+/).filter(Boolean).length;

const posts = list("posts")
  .map((file) => {
    const { meta, body } = parse(read(join("posts", file)));
    const h1 = body.match(/^#\s+(.+)$/m);
    const firstPara =
      body
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .find((p) => p && !/^(#|!\[|```|>|-|\d+\.)/.test(p)) || "";
    const dateFromName = (file.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || "";
    return {
      slug:
        meta.slug ||
        file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, ""),
      file,
      title: meta.title || (h1 ? h1[1].trim() : file),
      date: meta.date || dateFromName,
      series: meta.series || null,
      part: meta.part ? Number(meta.part) : null,
      summary:
        meta.summary ||
        meta.excerpt ||
        plain(firstPara).replace(/\s+/g, " ").trim().slice(0, 200),
      tags: Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : [],
      minutes: Math.max(1, Math.round(words(body) / 220)),
      draft: meta.draft === true,
      lang: meta.lang || "en",
      translation: meta.translation || null,
    };
  })
  .filter((p) => !p.draft)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

const concepts = Object.fromEntries(
  list("concepts").map((file) => {
    const { meta, body } = parse(read(join("concepts", file)));
    return [
      file.replace(/\.md$/, ""),
      {
        title: meta.title || file,
        tag: meta.tag || "",
        formula: meta.formula || "",
        text: body.trim(),
      },
    ];
  }),
);

const series = existsSync("series.yml") ? parseSeries(read("series.yml")) : {};

writeFileSync(
  join("posts", "index.json"),
  JSON.stringify({ posts, series, concepts }, null, 2) + "\n",
);
console.log(
  `Indexed ${posts.length} posts, ${Object.keys(concepts).length} concepts, ${Object.keys(series).length} series`,
);
