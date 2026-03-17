import { notFound } from "next/navigation";
import { getPostBySlug, getPosts } from "@/lib/posts";
import { extractHeadings, markdownToHtml } from "@/lib/markdown";
import { DocsLayout } from "@/components/docs-layout";
import type { Metadata } from "next";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

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
  const slugParts = (Array.isArray(slug) ? slug : [slug]).map(safeDecodeURIComponent);
  const post = getPostBySlug(slugParts);
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
  const slugParts = (Array.isArray(slug) ? slug : [slug]).map(safeDecodeURIComponent);

  const posts = getPosts();
  const slugPath = slugParts.join("/");
  const exists = posts.some((post) => post.slugAsPath === slugPath);
  if (!exists) notFound();

  const post = getPostBySlug(slugParts);
  if (!post) notFound();

  let contentHtml = "";
  try {
    contentHtml = await markdownToHtml(post.content);
  } catch (error) {
    console.error("markdownToHtml failed:", {
      slug: post.slugAsPath,
      error,
    });
    contentHtml = "<pre>render error</pre>";
  }
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
