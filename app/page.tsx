import Link from "next/link";
import { getPosts } from "@/lib/posts";

export default function HomePage() {
  const posts = getPosts();

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.slug} className="rounded-2xl border p-5">
          <p className="text-sm text-gray-500">{post.date}</p>
          <h2 className="mt-1 text-2xl font-semibold">
            <Link href={`/posts/${post.slug}`}>{post.title}</Link>
          </h2>
          <p className="mt-2 text-gray-700">{post.summary}</p>
        </article>
      ))}
    </div>
  );
}
