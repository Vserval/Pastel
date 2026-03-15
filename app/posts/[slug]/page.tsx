import { notFound } from "next/navigation";
import { getPostBySlug, getPosts } from "@/lib/posts";

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

  return (
    <article className="prose prose-neutral max-w-none">
      <p className="text-sm text-gray-500">{post.date}</p>
      <h1>{post.title}</h1>
      {post.content.split("\n").map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </article>
  );
}
