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
import type { Root as HastRoot, Element as HastElement } from "hast";
import type { Root as MdastRoot, Blockquote, Paragraph, Text } from "mdast";

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

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  clobberPrefix: "user-content-",
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
      /^data-[\w-]+$/i,
    ],
    a: [
      ...(((defaultSchema.attributes as any)?.a as any[]) ?? []),
      "href",
      "target",
      "rel",
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
  const result = await remark()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkGitHubAlerts)
    .use(remarkRehype, {
      allowDangerousHtml: true,
    })
    .use(rehypeRaw)
    .use(rehypeSanitize, SANITIZE_SCHEMA)
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
    .use(rehypePrettyCode, {
      theme: "github-dark-default",
      keepBackground: false,
      defaultLang: "text",
    })
    .use(rehypeStringify, {
      allowDangerousHtml: true,
    })
    .process(markdown);

  return result.toString();
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
      const id = slugger.slug(text);

      return { level, text, id };
    });
}
