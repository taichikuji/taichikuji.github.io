import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import MarkdownIt from "markdown-it";
import { parse as parseYaml } from "yaml";

const postsDir = "content/posts";
const outputDir = "docs/blog";
const stagingDir = "docs/.blog-build";
const fields = ["title", "slug", "date", "summary", "tags", "draft"] as const;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false });

type Post = {
  title: string;
  slug: string;
  date: string;
  summary: string;
  tags: string[];
  draft: boolean;
  body: string;
};

function fail(file: string, message: string): never {
  throw new Error(`${file}: ${message}`);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

async function readPost(file: string): Promise<Post> {
  const text = await Bun.file(join(postsDir, file)).text();
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) fail(file, "missing or malformed YAML front matter");

  let parsed: unknown;
  try {
    parsed = parseYaml(match[1], { schema: "core" });
  } catch (error) {
    fail(file, `invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail(file, "front matter must be a YAML object");
  }

  const metadata = parsed as Record<string, unknown>;
  const missing = fields.find((field) => !(field in metadata));
  const unknown = Object.keys(metadata).find((field) => !fields.includes(field as typeof fields[number]));
  if (missing) fail(file, `missing metadata field '${missing}'`);
  if (unknown) fail(file, `unknown metadata field '${unknown}'`);

  const { title, slug, date, summary, tags, draft } = metadata;
  if (typeof title !== "string" || !title.trim()) fail(file, "title must be a non-empty string");
  if (typeof slug !== "string" || !slugPattern.test(slug)) fail(file, "slug must be lowercase kebab-case");
  if (file !== `${slug}.md`) fail(file, `filename must match slug '${slug}'`);
  if (!isDate(date)) fail(file, "date must be a real date using YYYY-MM-DD");
  if (typeof summary !== "string" || !summary.trim()) fail(file, "summary must be a non-empty string");
  if (!Array.isArray(tags) || !tags.length || tags.some((tag) => typeof tag !== "string" || !slugPattern.test(tag))) {
    fail(file, "tags must be a non-empty list of lowercase kebab-case labels");
  }
  if (new Set(tags).size !== tags.length) fail(file, "tags must not repeat");
  if (typeof draft !== "boolean") fail(file, "draft must be true or false");
  if (!match[2].trim()) fail(file, "post body must not be empty");

  return {
    title: title.trim(),
    slug,
    date,
    summary: summary.trim(),
    tags,
    draft,
    body: match[2],
  };
}

function layout(title: string, description: string, menu: string, content: string, footer = ""): string {
  const footerHtml = footer ? `\n    <footer>${footer}</footer>` : "";
  return `<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} | Taichikuji</title>
  <link rel="stylesheet" href="../resources/normalize.css">
  <link rel="stylesheet" href="https://unpkg.com/terminal.css@0.7.4/dist/terminal.min.css">
  <link rel="stylesheet" href="../resources/site.css">
</head>
<body class="terminal">
  <div class="container">
    <nav class="terminal-nav">
      <header class="terminal-logo">
        <div class="logo terminal-prompt"><a href="../index.html" class="no-style">Taichikuji</a></div>
      </header>
      <div class="terminal-menu"><ul>${menu}</ul></div>
    </nav>
    <main>${content}</main>${footerHtml}
  </div>
</body>
</html>
`;
}

function article(post: Post): string {
  const menu = '<li><a href="index.html">Blog</a></li><li><a href="../index.html">Home</a></li>';
  const tags = post.tags.map(escapeHtml).join(" / ");
  const content = `<article>
      <header>
        <h1>${escapeHtml(post.title)}</h1>
        <p>${post.date}</p>
        <p>${escapeHtml(post.summary)}</p>
        <p>Tags: ${tags}</p>
      </header>
      ${markdown.render(post.body)}
    </article>`;
  const footer = '<a href="index.html">Back to blog</a> | <a href="../index.html">Home</a>';
  return layout(post.title, post.summary, menu, content, footer);
}

function blogIndex(posts: Post[]): string {
  const description = "Notes about infrastructure, automation, systems, and things I learn along the way.";
  const entries = posts
    .map((post) => `<li><a href="${post.slug}.html">${escapeHtml(post.title)}</a> - ${post.date}<br>${escapeHtml(post.summary)}</li>`)
    .join("\n");
  const list = entries || "<li>No posts yet.</li>";
  return layout(
    "Blog",
    "Notes and articles by Iván (Taichums).",
    '<li><a href="../index.html">Home</a></li>',
    `<h1>Blog</h1><p>${description}</p><ul>${list}</ul>`,
  );
}

await mkdir(postsDir, { recursive: true });
const files = (await readdir(postsDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => entry.name)
  .sort();
const posts = await Promise.all(files.map(readPost));
const published = posts.filter((post) => !post.draft).sort((a, b) => b.date.localeCompare(a.date));
const pages = published.map((post) => [`${post.slug}.html`, article(post)] as const);
pages.push(["index.html", blogIndex(published)]);

await rm(stagingDir, { recursive: true, force: true });
await mkdir(stagingDir, { recursive: true });
await Promise.all(pages.map(([file, html]) => Bun.write(join(stagingDir, file), html)));
await rm(outputDir, { recursive: true, force: true });
await rename(stagingDir, outputDir);

console.log(`Built ${published.length} published post${published.length === 1 ? "" : "s"} from ${posts.length} source file${posts.length === 1 ? "" : "s"}.`);
