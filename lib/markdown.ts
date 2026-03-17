import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";
import fs from "node:fs";
import path from "node:path";
import { basePath } from "@/lib/site";
import type {
  Root as HastRoot,
  Element as HastElement,
  Text as HastText,
} from "hast";
import type { Root as MdastRoot, Blockquote, Paragraph, Text } from "mdast";

type SanitizeSchema = NonNullable<Parameters<typeof rehypeSanitize>[0]>;

const POSTS_DIRECTORY = path.join(process.cwd(), "posts");
const PUBLIC_POSTS_DIRECTORY = path.join(process.cwd(), "public", "posts");

function isInsideDir(filePath: string, dirPath: string): boolean {
  const rel = path.relative(dirPath, filePath);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function languageFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/^\./, "");
  switch (ext) {
    case "py":
      return "python";
    case "js":
      return "javascript";
    case "jsx":
      return "jsx";
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "sh":
      return "bash";
    case "ps1":
      return "powershell";
    case "json":
      return "json";
    case "yml":
    case "yaml":
      return "yaml";
    case "md":
      return "markdown";
    default:
      return ext || "text";
  }
}

function pickBacktickFence(body: string, minLen = 3): string {
  let longest = 0;
  for (const match of body.matchAll(/`+/g)) {
    longest = Math.max(longest, match[0].length);
  }
  return "`".repeat(Math.max(minLen, longest + 1));
}

function findFilesByBasename(dir: string, basename: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFilesByBasename(fullPath, basename));
      continue;
    }
    if (entry.isFile() && entry.name === basename) {
      results.push(fullPath);
    }
  }

  return results;
}

async function expandObsidianEmbeds(markdown: string): Promise<string> {
  // Obsidian embed syntax: ![[path/to/file.ext]] or ![[file.ext|alias]]
  const EMBED_RE = /!\[\[([^\]\|]+?)(?:\|([^\]]+))?\]\]/g;
  const IMAGE_EXTS = new Set([
    ".avif",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".svg",
  ]);
  const TEXT_EXTS = new Set([
    ".txt",
    ".md",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".yml",
    ".yaml",
    ".sh",
    ".ps1",
    ".py",
    ".html",
    ".css",
    ".xml",
  ]);

  const matches = Array.from(markdown.matchAll(EMBED_RE));
  if (matches.length === 0) return markdown;

  const replacements = await Promise.all(
    matches.map(async (match) => {
      const raw = match[0];
      const target = (match[1] ?? "").trim();
      const alias = (match[2] ?? "").trim();
      if (!target) return { raw, rendered: raw };

      const normalized = target.replace(/^\.?[\\/]+/, "").replace(/\\/g, "/");
      const candidatePaths = [
        path.join(POSTS_DIRECTORY, normalized),
        path.join(PUBLIC_POSTS_DIRECTORY, normalized),
      ];

      let resolvedPath: string | null = null;
      for (const candidate of candidatePaths) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          resolvedPath = candidate;
          break;
        }
      }

      if (!resolvedPath) {
        const hits = [
          ...findFilesByBasename(POSTS_DIRECTORY, path.basename(normalized)),
          ...findFilesByBasename(PUBLIC_POSTS_DIRECTORY, path.basename(normalized)),
        ].sort((a, b) => a.localeCompare(b, "ja"));
        resolvedPath = hits[0] ?? null;
      }

      if (!resolvedPath) {
        const fence = "```";
        const safeTarget = target.replace(/`/g, "\\`");
        return {
          raw,
          rendered: `${fence}text\n[Obsidian埋め込みの参照先が見つかりません] ${safeTarget}\n${fence}\n`,
        };
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      const relativeForPublic = isInsideDir(resolvedPath, PUBLIC_POSTS_DIRECTORY)
        ? path.relative(PUBLIC_POSTS_DIRECTORY, resolvedPath).replace(/\\/g, "/")
        : path.relative(POSTS_DIRECTORY, resolvedPath).replace(/\\/g, "/");
      const publicSrc = `${basePath}/posts/${encodeURI(relativeForPublic)}`;

      if (IMAGE_EXTS.has(ext)) {
        const alt = alias || path.basename(resolvedPath, ext);
        const safeAlt = alt.replace(/"/g, "&quot;");
        return {
          raw,
          rendered: `\n<img src="${publicSrc}" alt="${safeAlt}" loading="lazy" decoding="async" />\n`,
        };
      }

      if (ext === ".md") {
        const content = await fs.promises.readFile(resolvedPath, "utf8");
        // 埋め込み先が Markdown の場合は、そのままインライン展開する（再帰展開はしない）
        return { raw, rendered: `\n${content}\n` };
      }

      if (TEXT_EXTS.has(ext) || ext) {
        const content = await fs.promises.readFile(resolvedPath, "utf8");
        const lang = languageFromFilename(resolvedPath);
        const fence = pickBacktickFence(content, 3);
        return { raw, rendered: `${fence}${lang}\n${content}\n${fence}\n` };
      }

      return {
        raw,
        rendered: `\n<a href="${publicSrc}" target="_blank" rel="noreferrer noopener">${path.basename(resolvedPath)}</a>\n`,
      };
    })
  );

  const replacementMap = new Map<string, string>();
  for (const { raw, rendered } of replacements) replacementMap.set(raw, rendered);

  return markdown.replace(EMBED_RE, (raw) => replacementMap.get(raw) ?? raw);
}

const ALERT_META: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  NOTE: { label: "Note", className: "markdown-alert-note" },
  TIP: { label: "Tip", className: "markdown-alert-tip" },
  IMPORTANT: { label: "Important", className: "markdown-alert-important" },
  WARNING: { label: "Warning", className: "markdown-alert-warning" },
  CAUTION: { label: "Caution", className: "markdown-alert-caution" },
};

function remarkGitHubAlerts() {
  return (tree: MdastRoot) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0];
      if (!first || first.type !== "paragraph") return;

      const firstParagraph = first as Paragraph;
      const firstChild = firstParagraph.children[0];
      if (!firstChild || firstChild.type !== "text") return;

      const textNode = firstChild as Text;
      const match = textNode.value.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/
      );

      if (!match) return;

      const alertType = match[1];
      const meta = ALERT_META[alertType];
      if (!meta) return;

      textNode.value = textNode.value.replace(match[0], "").trimStart();

      if (textNode.value.length === 0) {
        firstParagraph.children.shift();
      }

      while (
        firstParagraph.children.length > 0 &&
        firstParagraph.children[0].type === "break"
      ) {
        firstParagraph.children.shift();
      }

      if (firstParagraph.children.length === 0) {
        node.children.shift();
      }

      (node.data ??= {}).hName = "div";
      (node.data ??= {}).hProperties = {
        className: ["markdown-alert", meta.className],
      };

      node.children.unshift({
        type: "paragraph",
        data: {
          hName: "p",
          hProperties: {
            className: ["markdown-alert-title"],
          },
        },
        children: [
          {
            type: "text",
            value: meta.label,
          },
        ],
      } as Paragraph);
    });
  };
}

function rehypeExternalLinks() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: HastElement) => {
      if (node.tagName !== "a") return;

      const href = node.properties?.href;
      if (typeof href !== "string") return;
      if (href.startsWith("/") || href.startsWith("#")) return;

      node.properties = {
        ...node.properties,
        target: "_blank",
        rel: ["noreferrer", "noopener"],
      };
    });
  };
}

function rehypeMermaidBlocks() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: HastElement, index, parent) => {
      if (node.tagName !== "pre" || !parent || typeof index !== "number") {
        return;
      }

      const code = node.children[0] as HastElement | undefined;
      if (!code || code.type !== "element" || code.tagName !== "code") {
        return;
      }

      const className = code.properties?.className;
      const classes = Array.isArray(className) ? className : [];
      const isMermaid = classes.includes("language-mermaid");

      if (!isMermaid) return;

      const text = (code.children as HastText[])
        .filter((child) => child.type === "text")
        .map((child) => child.value)
        .join("");

      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: {
          className: ["mermaid"],
        },
        children: [
          {
            type: "text",
            value: text,
          },
        ],
      } as HastElement;
    });
  };
}

const SANITIZE_SCHEMA: SanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: "user-content-",
  tagNames: [
    ...((defaultSchema.tagNames ?? []) as string[]),
    "figure",
    "figcaption",
    "svg",
    "g",
    "path",
    "line",
    "rect",
    "circle",
    "ellipse",
    "polygon",
    "polyline",
    "marker",
    "defs",
    "pattern",
    "mask",
    "clipPath",
    "linearGradient",
    "radialGradient",
    "stop",
    "foreignObject",
    "text",
    "tspan",
  ],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    "*": [
      ...(((defaultSchema.attributes as any)?.["*"] as any[]) ?? []),
      "id",
      "className",
      "title",
      "ariaLabel",
      "ariaCurrent",
      "ariaHidden",
      "role",
      "style",
      "data-line",
      "data-highlighted-line",
      "data-highlighted-chars",
      "data-rehype-pretty-code-figure",
      "data-rehype-pretty-code-title",
    ],
    figure: [
      "className",
      "data-rehype-pretty-code-figure",
    ],
    figcaption: [
      "className",
      "data-rehype-pretty-code-title",
    ],
    svg: [
      "viewBox",
      "width",
      "height",
      "xmlns",
      "fill",
      "stroke",
      "stroke-width",
      "className",
      "role",
      "aria-labelledby",
      "ariaLabelledby",
    ],
    g: ["fill", "stroke", "className", "transform"],
    path: ["d", "fill", "stroke", "stroke-width", "marker-start", "marker-end"],
    line: ["x1", "x2", "y1", "y2", "stroke", "stroke-width"],
    rect: [
      "x",
      "y",
      "width",
      "height",
      "rx",
      "ry",
      "fill",
      "stroke",
      "stroke-width",
    ],
    circle: ["cx", "cy", "r", "fill", "stroke", "stroke-width"],
    ellipse: ["cx", "cy", "rx", "ry", "fill", "stroke", "stroke-width"],
    polygon: ["points", "fill", "stroke", "stroke-width"],
    polyline: ["points", "fill", "stroke", "stroke-width"],
    marker: [
      "id",
      "viewBox",
      "refX",
      "refY",
      "markerWidth",
      "markerHeight",
      "orient",
    ],
    defs: [],
    pattern: ["id", "width", "height", "patternUnits"],
    mask: ["id"],
    clipPath: ["id"],
    linearGradient: ["id", "x1", "x2", "y1", "y2"],
    radialGradient: ["id", "cx", "cy", "r", "fx", "fy"],
    stop: ["offset", "stop-color", "stop-opacity", "stopColor", "stopOpacity"],
    foreignObject: ["x", "y", "width", "height"],
    text: [
      "x",
      "y",
      "fill",
      "font-size",
      "font-family",
      "text-anchor",
      "dominant-baseline",
      "fontSize",
      "fontFamily",
      "textAnchor",
      "dominantBaseline",
    ],
    tspan: ["x", "y", "dx", "dy"],
    a: [
      ...(((defaultSchema.attributes as any)?.a as any[]) ?? []),
      "href",
      "target",
      "rel",
      "className",
      "ariaLabel",
    ],
    img: [
      ...(((defaultSchema.attributes as any)?.img as any[]) ?? []),
      "src",
      "alt",
      "title",
      "loading",
      "decoding",
      "width",
      "height",
    ],
    code: [
      ...(((defaultSchema.attributes as any)?.code as any[]) ?? []),
      "className",
    ],
    pre: [
      ...(((defaultSchema.attributes as any)?.pre as any[]) ?? []),
      "className",
    ],
    span: [
      ...(((defaultSchema.attributes as any)?.span as any[]) ?? []),
      "className",
    ],
    div: [
      ...(((defaultSchema.attributes as any)?.div as any[]) ?? []),
      "className",
    ],
    p: [
      ...(((defaultSchema.attributes as any)?.p as any[]) ?? []),
      "className",
    ],
    h2: [
      ...(((defaultSchema.attributes as any)?.h2 as any[]) ?? []),
      "id",
      "className",
    ],
    h3: [
      ...(((defaultSchema.attributes as any)?.h3 as any[]) ?? []),
      "id",
      "className",
    ],
    h4: [
      ...(((defaultSchema.attributes as any)?.h4 as any[]) ?? []),
      "id",
      "className",
    ],
  },
};

export async function markdownToHtml(markdown: string): Promise<string> {
  const expanded = await expandObsidianEmbeds(markdown);
  const base = remark()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkGitHubAlerts)
    .use(remarkRehype, {
      allowDangerousHtml: true,
    })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: {
        ariaLabel: "見出しへのリンク",
        className: ["heading-anchor"],
      },
      content: {
        type: "text",
        value: "#",
      },
    })
    .use(rehypeExternalLinks)
    .use(rehypeMermaidBlocks);

  try {
    const result = await base
      .use(rehypePrettyCode, {
        theme: "github-dark-default",
        keepBackground: false,
        defaultLang: "text",
      })
      .use(rehypeSanitize, SANITIZE_SCHEMA)
      .use(rehypeStringify, {
        allowDangerousHtml: true,
      })
      .process(expanded);

    return result.toString();
  } catch (error) {
    console.error("rehype-pretty-code failed; fallback to plain code blocks:", error);

    const result = await base
      .use(rehypeSanitize, SANITIZE_SCHEMA)
      .use(rehypeStringify, {
        allowDangerousHtml: true,
      })
      .process(expanded);

    return result.toString();
  }
}

export type Heading = {
  level: number;
  text: string;
  id: string;
};

export function extractHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();

  return markdown
    .split("\n")
    .filter((line) => /^##\s+/.test(line) || /^###\s+/.test(line))
    .map((line) => {
      const level = line.startsWith("###") ? 3 : 2;
      const text = line.replace(/^###?\s+/, "").trim();
      const id = `user-content-${slugger.slug(text)}`;

      return { level, text, id };
    });
}
