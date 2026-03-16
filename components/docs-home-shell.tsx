 "use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DocsSidebar } from "@/components/docs-sidebar";
import { SearchBox } from "@/components/search-box";
import { DocsHome } from "@/components/docs-home";
import type { PostMeta } from "@/lib/posts";
import { basePath } from "@/lib/site";

export function DocsHomeShell({ posts }: { posts: PostMeta[] }) {
  const [query, setQuery] = useState("");

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return posts;

    return posts.filter((post) =>
      [post.title, post.description ?? "", post.category ?? "", post.slugAsPath]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [posts, query]);

  return (
    <div className="docs-shell docs-shell--dark">
      <header className="topbar topbar--dark">
        <Link href="/" className="topbar-brand" prefetch={false}>
          <span className="topbar-logo" aria-hidden="true">
            <img src={`${basePath}/freepik__text-to-image__24694.png`} alt="" />
          </span>
          <span className="topbar-title">My Docs</span>
        </Link>
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="記事を検索する"
        />
      </header>

      <div className="docs-grid docs-grid--home">
        <aside className="left-rail left-rail--dark">
          <DocsSidebar posts={posts} currentSlug="" />
        </aside>

        <main className="content-rail content-rail--home">
          <DocsHome posts={filteredPosts} />
        </main>
      </div>
    </div>
  );
}
