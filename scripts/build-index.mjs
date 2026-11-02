// Reads every posts/*.md, pulls the frontmatter, writes posts/index.json.
// No dependencies. Frontmatter is optional: title falls back to the first "# " heading,
// date to the YYYY-MM-DD prefix of the file name, excerpt to the first paragraph.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "posts";
const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));

function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (!kv) continue;
      let v = kv[2].trim();
      if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      else v = v.replace(/^["']|["']$/g, "");
      meta[kv[1]] = v;
    }
  }
  return { meta, body: m ? text.slice(m[0].length) : text };
}

const posts = files.map((file) => {
  const { meta, body } = parse(readFileSync(join(DIR, file), "utf8"));
  const h1 = body.match(/^#\s+(.+)$/m);
  const firstPara = body.split(/\n{2,}/).map((s) => s.trim()).find((p) => p && !/^(#|!\[|```|>|-|\d+\.)/.test(p)) || "";
  const dateFromName = (file.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || "";
  return {
    slug: meta.slug || file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, ""),
    file,
    title: meta.title || (h1 ? h1[1].trim() : file),
    date: meta.date || dateFromName,
    category: meta.category || "Notes",
    tags: Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : [],
    excerpt: meta.excerpt || firstPara.replace(/[*_`]/g, "").slice(0, 220),
  };
}).sort((a, b) => (a.date < b.date ? 1 : -1));

writeFileSync(join(DIR, "index.json"), JSON.stringify(posts, null, 2) + "\n");
console.log(`Indexed ${posts.length} posts`);
