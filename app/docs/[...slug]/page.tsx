import { notFound } from "next/navigation";
import { getPostBySlug, getPosts } from "@/lib/posts";
import { extractHeadings, markdownToHtml } from "@/lib/markdown";
import { DocsLayout } from "@/components/docs-layout";
import type { Metadata } from "next";

export function generateStaticParams() {
  return getPosts().map((post) => ({
    slug: post.slug,
  }));
}

type Props = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(Array.isArray(slug) ? slug : [slug]);
  if (!post) return {};

  const title = `${post.title} | My Docs`;
  const description = post.description || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

function formatDate(dateString?: string): string | null {
  if (!dateString) return null;
  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) return dateString;

  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(timestamp));
  } catch {
    return dateString;
  }
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;

  const posts = getPosts();
  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;
  const exists = posts.some((post) => post.slugAsPath === slugPath);
  if (!exists) notFound();

  const post = getPostBySlug(Array.isArray(slug) ? slug : [slug]);
  if (!post) notFound();

  const contentHtml = await markdownToHtml(post.content);
  const headings = extractHeadings(post.content);
  const formattedDate = formatDate(post.date);

  return (
    <DocsLayout
      posts={posts}
      currentSlug={post.slugAsPath}
      headings={headings}
    >
      <article className="doc-article">
        <div className="doc-header">
          <p className="doc-category">{post.category}</p>
          <h1>{post.title}</h1>
          {formattedDate ? (
            <p className="doc-date">
              <time dateTime={post.date}>{formattedDate}</time>
            </p>
          ) : null}
          {post.description ? (
            <p className="doc-description">{post.description}</p>
          ) : null}
        </div>

        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>
    </DocsLayout>
  );
}
