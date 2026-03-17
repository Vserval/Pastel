 "use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsToc } from "@/components/docs-toc";
import { SearchBox } from "@/components/search-box";
import type { PostMeta } from "@/lib/posts";
import type { Heading } from "@/lib/markdown";
import { basePath } from "@/lib/site";

export function DocsLayout({
  posts,
  currentSlug,
  headings,
  children,
}: {
  posts: PostMeta[];
  currentSlug: string;
  headings: Heading[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return posts.slice(0, 8);

    return posts
      .filter((post) =>
        [post.title, post.description ?? "", post.category ?? "", post.slugAsPath]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      )
      .slice(0, 8);
  }, [posts, query]);

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const first = filteredPosts[0];
      if (!first) return;
      setQuery("");
      router.push(`/docs/${first.slugAsPath}/`);
    }

    if (event.key === "Escape") {
      setQuery("");
      event.currentTarget.blur();
    }
  };

  useEffect(() => {
    const figures = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".markdown-body [data-rehype-pretty-code-figure]"
      )
    );

    figures.forEach((figure) => {
      if (figure.dataset.hasCodeEnhancer === "true") return;

      const pre = figure.querySelector<HTMLPreElement>("pre");
      const code = figure.querySelector<HTMLElement>("pre code");
      if (!pre || !code) return;

      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-button";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "コードをコピー");

      button.addEventListener("click", async () => {
        try {
          const text = Array.from(
            code.querySelectorAll<HTMLElement>("[data-line]")
          )
            .map((line) => line.textContent ?? "")
            .join("\n");

          await navigator.clipboard.writeText(text || code.textContent || "");

          button.dataset.copied = "true";
          button.textContent = "Copied";

          window.setTimeout(() => {
            button.dataset.copied = "false";
            button.textContent = "Copy";
          }, 1600);
        } catch {
          button.textContent = "Failed";
          window.setTimeout(() => {
            button.textContent = "Copy";
          }, 1600);
        }
      });

      figure.parentNode?.insertBefore(wrapper, figure);
      wrapper.appendChild(figure);
      wrapper.appendChild(button);

      figure.dataset.hasCodeEnhancer = "true";
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      const mermaidBlocks = Array.from(
        document.querySelectorAll<HTMLElement>(".markdown-body .mermaid")
      );

      if (mermaidBlocks.length === 0) return;

      const mermaidModule = await import("mermaid");
      if (cancelled) return;

      const mermaid = mermaidModule.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "strict",
        flowchart: {
          curve: "basis",
          htmlLabels: true,
          padding: 18,
          nodeSpacing: 34,
          rankSpacing: 42,
        },
        sequence: {
          useMaxWidth: true,
          wrap: true,
          diagramMarginX: 24,
          diagramMarginY: 16,
          actorMargin: 40,
          messageMargin: 28,
        },
        themeVariables: {
          background: "#0b1020",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          fontSize: "14px",
          textColor: "#e5e7eb",

          primaryColor: "#182334",
          primaryTextColor: "#e5e7eb",
          primaryBorderColor: "#8fb7d8",

          secondaryColor: "#111827",
          secondaryTextColor: "#dbe4ee",
          secondaryBorderColor: "#4b5f77",

          tertiaryColor: "#0f172a",
          tertiaryTextColor: "#d7e0ea",
          tertiaryBorderColor: "#32465d",

          mainBkg: "#182334",
          secondBkg: "#111827",
          tertiaryBkg: "#0f172a",

          lineColor: "#88a9c7",
          defaultLinkColor: "#88a9c7",

          nodeBorder: "#8fb7d8",
          clusterBkg: "rgba(255,255,255,0.02)",
          clusterBorder: "#2a3a4f",

          edgeLabelBackground: "#111827",
          labelBackground: "#111827",

          actorBkg: "#182334",
          actorBorder: "#8fb7d8",
          actorTextColor: "#e5e7eb",
          actorLineColor: "#5c728a",
          signalColor: "#8fb7d8",
          signalTextColor: "#dbe4ee",

          sectionBkgColor: "rgba(255,255,255,0.02)",
          altSectionBkgColor: "rgba(255,255,255,0.03)",
          sectionBkg: "rgba(255,255,255,0.02)",

          cScale0: "#182334",
          cScale1: "#1d2a3d",
          cScale2: "#223149",
          cScale3: "#273854",
          cScale4: "#2c405f",
          cScale5: "#31476a",
          cScale6: "#374f75",
          cScale7: "#3d5780",
        },
      });

      await mermaid.run({
        nodes: mermaidBlocks,
      });
    }

    renderMermaid().catch((error) => {
      console.error("Mermaid render failed:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [children]);

  const segments = currentSlug.split("/").filter(Boolean);

  return (
    <div className="docs-shell docs-shell--dark">
      <header className="topbar topbar--dark">
        <Link href="/" className="topbar-brand" prefetch={false}>
          <span className="topbar-logo" aria-hidden="true">
            <img src={`${basePath}/freepik__text-to-image__24694.png`} alt="" />
          </span>
          <span className="topbar-title">My Docs</span>
        </Link>

        <div className="topbar-search-area">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="記事を検索する"
            onKeyDown={handleSearchKeyDown}
          />
          {query ? (
            <div
              className="topbar-search-results"
              aria-label="検索候補"
            >
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <button
                    key={post.slugAsPath}
                    type="button"
                    className="topbar-search-result"
                    onClick={() => {
                      setQuery("");
                      router.push(`/docs/${post.slugAsPath}/`);
                    }}
                  >
                    <strong>{post.title}</strong>
                    <span>{post.category}</span>
                  </button>
                ))
              ) : (
                <div className="topbar-search-empty">記事が見つかりません</div>
              )}
            </div>
          ) : null}
        </div>
      </header>

      <div className="docs-grid">
        <aside className="left-rail left-rail--dark">
          <DocsSidebar posts={posts} currentSlug={currentSlug} />
        </aside>

        <main className="content-rail">
          <nav className="breadcrumbs" aria-label="パンくず">
            <ol>
              <li>
                <Link href="/" prefetch={false}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/docs/" prefetch={false}>
                  Docs
                </Link>
              </li>
              {segments.map((segment, index) => {
                const href = `/docs/${segments.slice(0, index + 1).join("/")}/`;
                const isLast = index === segments.length - 1;

                return (
                  <li key={href}>
                    {isLast ? (
                      <span aria-current="page">{segment}</span>
                    ) : (
                      <Link href={href} prefetch={false}>
                        {segment}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="toc-mobile">
            <DocsToc headings={headings} variant="mobile" />
          </div>

          {children}
        </main>

        <aside className="right-rail">
          <DocsToc headings={headings} />
        </aside>
      </div>
    </div>
  );
}
