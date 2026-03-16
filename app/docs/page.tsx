import { getPosts } from "@/lib/posts";
import { DocsHomeShell } from "@/components/docs-home-shell";

export default function DocsIndexPage() {
  const posts = getPosts();
  return <DocsHomeShell posts={posts} />;
}

