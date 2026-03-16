 "use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PostMeta } from "@/lib/posts";
import { basePath } from "@/lib/site";

const PAGE_SIZE = 12;

export function DocsHome({ posts }: { posts: PostMeta[] }) {
  const recommended = posts.slice(0, 3);

  const categories = useMemo(
    () =>
      [
        "すべて",
        ...Array.from(
          new Set(
            posts
              .map((p) => p.category)
              .filter((c): c is string => typeof c === "string" && c.length > 0)
          )
        ),
      ],
    [posts]
  );

  const [activeCategory, setActiveCategory] = useState("すべて");
  const [page, setPage] = useState(1);

  const filteredPosts = useMemo(() => {
    return posts.filter(
      (post) =>
        activeCategory === "すべて" || post.category === activeCategory
    );
  }, [posts, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginatedPosts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredPosts.slice(start, start + PAGE_SIZE);
  }, [filteredPosts, safePage]);

  const startIndex =
    filteredPosts.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex =
    filteredPosts.length === 0
      ? 0
      : Math.min(safePage * PAGE_SIZE, filteredPosts.length);

  function handleCategoryChange(category: string) {
    setActiveCategory(category);
    setPage(1);
  }

  return (
    <div className="docs-home">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">ドキュメント</p>
          <h1 className="hero-title">Get started</h1>
          <p className="hero-lead">
            プロダクトや開発環境のセットアップ手順を、素早く見つけられるドキュメントサイトです。
          </p>
        </div>
        <div className="hero-image">
          <img
            src={`${basePath}/freepik__text-to-image__26502.png`}
            alt=""
            className="hero-image-img"
            width={560}
            height={350}
          />
        </div>
      </section>

      <section className="recommended">
        <h2 className="section-title">推奨</h2>
        <div className="recommended-grid">
          {recommended.map((post) => (
            <Link
              key={post.slugAsPath}
              href={`/docs/${post.slugAsPath}/`}
              className="recommended-card"
              prefetch={false}
            >
              <span className="recommended-card-category">{post.category}</span>
              <strong title={post.title}>{post.title}</strong>
              <p>{post.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="articles-section">
        <div className="articles-header">
          <h2 className="section-title">記事</h2>

          <div className="articles-toolbar">
            <div
              className="filter-pills"
              role="group"
              aria-label="カテゴリで絞り込み"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-pill ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="empty-state">
            <strong>記事が見つかりませんでした</strong>
            <p>カテゴリを変えるか、右上の検索でキーワードを試してみてください。</p>
          </div>
        ) : (
          <>
            <div className="articles-grid">
              {paginatedPosts.map((post) => (
                <Link
                  key={post.slugAsPath}
                  href={`/docs/${post.slugAsPath}/`}
                  className="article-card"
                  prefetch={false}
                >
                  <span className="article-card-category">{post.category}</span>
                  <strong title={post.title}>{post.title}</strong>
                  <p>{post.description}</p>
                </Link>
              ))}
            </div>

            <nav className="pagination" aria-label="ページネーション">
              <span className="pagination-info">
                {startIndex}–{endIndex} / {filteredPosts.length} 件を表示
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  前へ
                </button>

                <span className="pagination-page-indicator">
                  {safePage} / {totalPages}
                </span>

                <button
                  type="button"
                  className="pagination-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  次へ
                </button>
              </div>
            </nav>
          </>
        )}
      </section>

      <section className="help-section">
        <h2 className="section-title">ヘルプ & サポート</h2>
        <div className="help-grid">
          <div className="help-card">
            <strong>ドキュメント</strong>
            <p>使い方や設定手順はこちらから探せます。</p>
          </div>
          <div className="help-card">
            <strong>よくある質問</strong>
            <p>よくある質問と回答をまとめています。</p>
          </div>
          <div className="help-card">
            <strong>お問い合わせ</strong>
            <p>問題が解決しない場合はご連絡ください。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
