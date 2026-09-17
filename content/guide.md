# Blog writing guide

This directory contains the source for the site's blog.

## Where posts go

Only Markdown files inside `content/posts/` become published posts. This guide is documentation for the author and is not published as a post.

Create one file per post using a lowercase, kebab-case filename, for example:

`content/posts/setting-up-simplemenu.md`

## Required metadata

Every post must begin with YAML front matter containing exactly these fields:

```yaml
---
title: Setting up Simplemenu on the Powkiddy V90
slug: setting-up-simplemenu
date: 2026-09-17
summary: The proper way to install and configure Simplemenu.
tags:
  - linux
  - handhelds
  - documentation
draft: false
---
```

- `title` is the title shown on the article page and blog index.
- `slug` becomes the HTML filename, must be lowercase kebab-case, and must match the Markdown filename.
- `date` must be a real calendar date using `YYYY-MM-DD`.
- `summary` is a short description used on the blog index and in page metadata.
- `tags` is a non-empty list of unique lowercase kebab-case labels shown on the article.
- `draft: true` keeps a post out of the production blog.

The build fails when metadata is missing or invalid, the filename and slug differ, tags repeat, or the post body is empty.

## Writing the body

The page template adds the title from the metadata. Do not repeat the title as a `#` heading in the body. Begin body sections with `##` and use `###` for subsections.

Use ordinary Markdown for paragraphs, lists, links, images, blockquotes, and separators. Use backticks only for genuine code, commands, filenames, or identifiers. Genuine code is intentionally rendered using Terminal.css's code styling; normal prose should remain plain text.

Keep the writing direct and personal. Explain what happened, what you learned, or how something works. Prefer short paragraphs and concrete examples over a large introductory block.

Use ASCII punctuation in prose. In particular, use `-` instead of em dashes or en dashes. Do not use Markdown code formatting just to make ordinary words look technical.

## Local workflow

Run the build from the repository root:

```text
bun run build
```

The generated files appear under `docs/blog/`. The build replaces only that generated directory. The homepage remains hand-written.
