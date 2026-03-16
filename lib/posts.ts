import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type PostMeta = {
  slug: string[];
  slugAsPath: string;
  title: string;
  description?: string;
  category?: string;
  date?: string;
  order?: number;
};

export type Post = PostMeta & {
  content: string;
};

const postsDirectory = path.join(process.cwd(), "posts");

function getMarkdownFiles(dir: string, baseDir = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return getMarkdownFiles(fullPath, baseDir);
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      return [path.relative(baseDir, fullPath)];
    }

    return [];
  });
}

export function getPosts(): PostMeta[] {
  const files = getMarkdownFiles(postsDirectory);

  return files
    .map((relativePath) => {
      const fullPath = path.join(postsDirectory, relativePath);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      const slugAsPath = relativePath.replace(/\.md$/, "").replace(/\\/g, "/");
      const slug = slugAsPath.split("/");

      return {
        slug,
        slugAsPath,
        title: data.title ?? slug[slug.length - 1],
        description: data.description ?? "",
        category: data.category ?? slug[0] ?? "Docs",
        date: data.date ?? "",
        order:
          typeof data.order === "number"
            ? data.order
            : typeof data.order === "string" && data.order.trim()
              ? Number(data.order)
              : undefined,
      };
    })
    .sort((a, b) => {
      const aDate = a.date ? Date.parse(a.date) : NaN;
      const bDate = b.date ? Date.parse(b.date) : NaN;
      const aHasDate = Number.isFinite(aDate);
      const bHasDate = Number.isFinite(bDate);
      if (aHasDate && bHasDate && aDate !== bDate) return bDate - aDate;
      if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;

      const aCat = a.slug[0] ?? "";
      const bCat = b.slug[0] ?? "";
      const catCmp = aCat.localeCompare(bCat, "ja");
      if (catCmp !== 0) return catCmp;

      const aDepth = a.slug.length;
      const bDepth = b.slug.length;
      if (aDepth !== bDepth) return aDepth - bDepth;

      const aOrder = typeof a.order === "number" && Number.isFinite(a.order) ? a.order : Infinity;
      const bOrder = typeof b.order === "number" && Number.isFinite(b.order) ? b.order : Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const pathCmp = a.slugAsPath.localeCompare(b.slugAsPath, "ja");
      if (pathCmp !== 0) return pathCmp;

      return a.title.localeCompare(b.title, "ja");
    });
}

export function getPostBySlug(slugParts: string[]): Post | undefined {
  const fullPath = path.join(postsDirectory, ...slugParts) + ".md";
  if (!fs.existsSync(fullPath)) return undefined;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: slugParts,
    slugAsPath: slugParts.join("/"),
    title: data.title ?? slugParts[slugParts.length - 1],
    description: data.description ?? "",
    category: data.category ?? slugParts[0] ?? "Docs",
    date: data.date ?? "",
    order:
      typeof data.order === "number"
        ? data.order
        : typeof data.order === "string" && data.order.trim()
          ? Number(data.order)
          : undefined,
    content,
  };
}
