import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";

const postsDirectory = path.join(process.cwd(), "posts");

export type Post = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  content: string;
  tags?: string[];
};

export function getPosts(): Post[] {
  const filenames = fs.readdirSync(postsDirectory);

  const posts = filenames
    .filter((filename) => filename.endsWith(".md"))
    .map((filename) => {
      const filePath = path.join(postsDirectory, filename);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(fileContents);

      return {
        slug: filename.replace(/\.md$/, ""),
        title: data.title ?? "",
        date: data.date ?? "",
        summary: data.summary ?? "",
        content,
        tags: data.tags,
      };
    });

  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string): Post | undefined {
  const filePath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) return undefined;

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title ?? "",
    date: data.date ?? "",
    summary: data.summary ?? "",
    content,
    tags: data.tags,
  };
}

export async function markdownToHtml(content: string): Promise<string> {
  const result = await remark().use(remarkHtml).process(content);
  return String(result);
}
