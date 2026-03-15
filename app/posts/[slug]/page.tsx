import { notFound } from "next/navigation";
import { getPostBySlug, getPosts, markdownToHtml } from "@/lib/posts";

export function generateStaticParams() {
  return getPosts().map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) return notFound();

  const contentHtml = await markdownToHtml(post.content);

  return (
    <article className="prose prose-neutral max-w-none">
      <p className="text-sm text-gray-500">{post.date}</p>
      <h1>{post.title}</h1>
      <div
        className="prose prose-neutral max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  );
}
