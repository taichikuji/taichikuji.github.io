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
const pageTemplate = await Bun.file("scripts/blog-page.html").text();

type Post = {
  title: string;
  slug: string;
  date: string;
  summary: string;
  tags: string[];
  draft: boolean;
  body: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => entities[character]);
const fail = (file: string, message: string): never => {
  throw new Error(`${file}: ${message}`);
};

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validTags(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0
    && value.every((tag) => typeof tag === "string" && slugPattern.test(tag))
    && new Set(value).size === value.length;
}

async function readPost(file: string): Promise<Post> {
  const source = await Bun.file(join(postsDir, file)).text();
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) fail(file, "missing or malformed YAML front matter");

  let parsed: unknown;
  try {
    parsed = parseYaml(match[1], { schema: "core" });
  } catch (error) {
    fail(file, `invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail(file, "front matter must be a YAML object");

  const data = parsed as Record<string, unknown>;
  const missing = fields.find((field) => !(field in data));
  const unknown = Object.keys(data).find((field) => !fields.includes(field as typeof fields[number]));
  if (missing) fail(file, `missing metadata field '${missing}'`);
  if (unknown) fail(file, `unknown metadata field '${unknown}'`);

  const { title, slug, date, summary, tags, draft } = data;
  if (typeof title !== "string" || !title.trim()) fail(file, "title must be a non-empty string");
  if (typeof slug !== "string" || !slugPattern.test(slug)) fail(file, "slug must be lowercase kebab-case");
  if (file !== `${slug}.md`) fail(file, `filename must match slug '${slug}'`);
  if (!validDate(date)) fail(file, "date must be a real date using YYYY-MM-DD");
  if (typeof summary !== "string" || !summary.trim()) fail(file, "summary must be a non-empty string");
  if (!validTags(tags)) fail(file, "tags must be unique lowercase kebab-case labels");
  if (typeof draft !== "boolean") fail(file, "draft must be true or false");
  if (!match[2].trim()) fail(file, "post body must not be empty");

  return { title: title.trim(), slug, date, summary: summary.trim(), tags, draft, body: match[2] };
}

function page(title: string, description: string, content: string, isArticle = false): string {
  const values = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    content,
    menu: `${isArticle ? '<li><a href="index.html">Blog</a></li>' : ""}<li><a href="../index.html">Home</a></li>`,
    footer: isArticle ? '<footer><a href="index.html">Back to blog</a> | <a href="../index.html">Home</a></footer>' : "",
  };
  return pageTemplate.replace(
    /{{(title|description|content|menu|footer)}}/g,
    (_, key: keyof typeof values) => values[key],
  );
}

function article(post: Post): string {
  const content = `<article><header>
      <h1>${escapeHtml(post.title)}</h1>
      <p>${post.date}</p>
      <p>${escapeHtml(post.summary)}</p>
      <p>Tags: ${post.tags.map(escapeHtml).join(" / ")}</p>
    </header>${markdown.render(post.body)}</article>`;
  return page(post.title, post.summary, content, true);
}

function blogIndex(posts: Post[]): string {
  const description = "Notes about infrastructure, automation, systems, and things I learn along the way.";
  const items = posts.map((post) =>
    `<li><a href="${post.slug}.html">${escapeHtml(post.title)}</a> - ${post.date}<br>${escapeHtml(post.summary)}</li>`
  ).join("\n") || "<li>No posts yet.</li>";
  return page("Blog", "Notes and articles by Iván (Taichums).", `<h1>Blog</h1><p>${description}</p><ul>${items}</ul>`);
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
