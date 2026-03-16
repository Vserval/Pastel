# my-dev-blog テンプレート（一式）

Next.js App Router / 静的エクスポート / GitHub Pages / Markdown 記事（ネストフォルダ・GFM・ダークUI対応）。
ライブラリ（node_modules）は含めていません。`npm install` で復元してください。

---

## `.github/workflows/deploy.yml`

```yaml
name: Deploy Next.js site to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## `.gitignore`

```text
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

---

## `app/docs/[...slug]/page.tsx`

```tsx
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
```

---

## `app/docs/page.tsx`

```tsx
import { getPosts } from "@/lib/posts";
import { DocsHomeShell } from "@/components/docs-home-shell";

export default function DocsIndexPage() {
  const posts = getPosts();
  return <DocsHomeShell posts={posts} />;
}
```

---

## `app/globals.css`

```css
:root {
  --bg: #0b1020;
  --bg-subtle: #111827;
  --panel: #1a2232;
  --panel-soft: #0f172a;
  --text: #e5e7eb;
  --muted: #94a3b8;
  --line: #243041;
  --accent: #7cc4ff;
  --accent-soft: rgba(124, 196, 255, 0.08);
  --accent-line: rgba(124, 196, 255, 0.42);
  --max: 1440px;

  /* スクロールバー色（共通） */
  --scrollbar-thumb: rgba(148, 163, 184, 0.24);
  --scrollbar-thumb-hover: rgba(148, 163, 184, 0.38);
  --scrollbar-track: transparent;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
    sans-serif;
  color: var(--text);
  background: var(--bg);
}

.docs-shell,
.docs-grid,
.content-rail,
.doc-article,
.markdown-body {
  min-width: 0;
}

a {
  color: inherit;
  text-decoration: none;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
  backdrop-filter: blur(8px);
}

.topbar-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
}

.topbar-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.topbar-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.topbar-title {
  display: inline-block;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(420px, 100%);
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
}

.search-icon {
  position: relative;
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  color: var(--muted);
}

.search-icon::before {
  content: "";
  position: absolute;
  inset: 0;
  width: 9px;
  height: 9px;
  border: 1.8px solid currentColor;
  border-radius: 999px;
}

.search-icon::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 6px;
  height: 1.8px;
  background: currentColor;
  border-radius: 999px;
  transform: rotate(45deg);
  transform-origin: center;
}

.search-box:focus-within {
  border-color: var(--accent-line);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.search-box:focus-within .search-icon {
  color: var(--text);
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 14px;
}

.search-box input::placeholder {
  color: var(--muted);
}

.docs-grid {
  display: grid;
  grid-template-columns: 350px minmax(0, 1fr) 240px;
  gap: 0;
  width: 100%;
  max-width: none;
  margin: 0;
  align-items: stretch;
}

.left-rail,
.right-rail {
  min-height: calc(100vh - 64px);
  padding: 0;
}

/* 左レール */
.left-rail {
  border-right: 1px solid var(--line);
  background: var(--bg-subtle);
}

/* 右レール（下まで背景） */
.right-rail {
  position: sticky;
  top: 64px;
  align-self: start;
  height: calc(100vh - 64px);
  min-height: calc(100vh - 64px);
  border-left: 1px solid var(--line);
  background: var(--panel-soft);
  overflow: hidden;
}

/* ここが重要: sidebar 本体の上下余白を 8px にする */
.sidebar {
  padding: 8px 20px;
}

.right-rail .toc {
  height: 100%;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 14px 20px;
}

.content-rail {
  min-width: 0;
  padding: 40px 56px 80px;
}

.doc-article {
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
}

.sidebar-title,
.toc-title,
.eyebrow,
.doc-category,
.doc-card-category {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sidebar ul,
.toc ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.sidebar li + li,
.toc li + li {
  margin-top: 4px;
}

/* サイドバー統一: 戻る・リンク・summary・子リンク */
.sidebar-back,
.sidebar a,
.sidebar-summary,
.sidebar-children a {
  min-height: 36px;
  min-width: 0;
}

.sidebar-back,
.sidebar a,
.sidebar-summary {
  display: flex;
  align-items: center;
}

.sidebar a,
.sidebar-summary,
.sidebar-children a,
.sidebar-back {
  border: 1px solid transparent;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.sidebar a:hover,
.sidebar-summary:hover,
.sidebar-children a:hover,
.sidebar-back:hover,
.toc a:hover {
  background: rgba(255, 255, 255, 0.035);
  border-color: transparent;
  color: var(--text);
}

.sidebar a,
.sidebar-children a {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.sidebar-link-text,
.sidebar-summary-label {
  display: block;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.sidebar a,
.sidebar-children a {
  position: relative;
  padding: 6px 10px 6px 14px;
  border-radius: 10px;
  color: var(--muted);
}

.sidebar a.active,
.sidebar-children a.active {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--text);
  font-weight: 600;
}

.sidebar a.active::before,
.sidebar-children a.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  border-radius: 999px;
  background: rgba(124, 196, 255, 0.9);
}

.sidebar-back {
  margin-bottom: 16px;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--muted);
  font-size: 14px;
}

/* アコーディオン（フォルダ＝子あり） */
.sidebar-accordion {
  margin-top: 0;
}

.sidebar-details {
  margin: 0;
}

.sidebar-summary {
  position: relative;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin: 0;
  padding: 6px 10px 6px 14px;
  border-radius: 10px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.sidebar-details[open] > .sidebar-summary {
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
}

.sidebar-details[open] > .sidebar-summary::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.sidebar-summary::-webkit-details-marker {
  display: none;
}

/* .sidebar-summary-label の省略は .sidebar-link-text と共通で上で定義 */

/* 三角は CSS で描画（フォントずれ防止） */
.sidebar-summary-icon {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  margin-right: 2px;
  transition: transform 0.2s ease, color 0.2s ease;
  color: var(--muted);
  font-size: 0;
  overflow: hidden;
}

.sidebar-details[open] .sidebar-summary-icon {
  transform: rotate(45deg);
}

.sidebar-details:not([open]) .sidebar-summary-icon {
  transform: rotate(-45deg);
}

.sidebar-summary:hover .sidebar-summary-icon {
  color: var(--text);
}

.sidebar-children {
  margin: 2px 0 0 8px;
  padding: 4px 0 0 12px;
  list-style: none;
  border-left: 1px solid rgba(124, 196, 255, 0.32);
}

.sidebar-children .sidebar-children {
  margin-left: 10px;
  padding-left: 10px;
}

.sidebar-children li {
  margin: 0;
}

.sidebar-children li + li {
  margin-top: 2px;
}

.sidebar-children a {
  min-height: 32px;
  font-size: 14px;
}

.toc-title {
  margin: 0 0 14px;
  padding: 0 10px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.toc ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.toc li + li {
  margin-top: 2px;
}

.toc a {
  position: relative;
  display: block;
  padding: 6px 10px 6px 14px;
  border-radius: 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.toc a[aria-current="true"] {
  background: rgba(124, 196, 255, 0.09);
  color: var(--text);
}

.toc .level-3 a {
  padding-left: 26px;
}

.breadcrumbs {
  margin: 0 0 16px;
}

.breadcrumbs-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  list-style: none;
  padding: 0;
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.breadcrumbs-item a {
  color: inherit;
}

.breadcrumbs-item a:hover {
  color: var(--text);
}

.breadcrumbs-inline {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.breadcrumbs-sep {
  opacity: 0.55;
}

.toc-mobile {
  display: none;
  margin: 0 0 18px;
}

.toc-mobile-details {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  overflow: hidden;
}

.toc-mobile-summary {
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  list-style: none;
}

.toc-mobile-summary::-webkit-details-marker {
  display: none;
}

.toc--mobile {
  padding: 0 10px 10px;
}

.doc-nav {
  margin-top: 40px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.doc-nav-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.doc-nav-link {
  display: block;
  padding: 14px 14px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.03),
    rgba(255, 255, 255, 0.015)
  );
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.doc-nav-link:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 196, 255, 0.18);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.045),
    rgba(255, 255, 255, 0.02)
  );
}

.doc-nav-kicker {
  display: block;
  margin: 0 0 6px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.doc-nav-title {
  display: block;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.doc-nav-link.next {
  text-align: right;
}


.home {
  padding: 48px 24px 80px;
}

.home-inner {
  max-width: 1120px;
  margin: 0 auto;
}

.home h1,
.doc-header h1 {
  margin: 0;
  font-size: clamp(36px, 5vw, 48px);
  line-height: 1.1;
}

.lead,
.doc-description {
  max-width: 720px;
  margin-top: 16px;
  color: var(--muted);
  font-size: 18px;
  line-height: 1.7;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 32px;
}

/* カード類の共通文法 */
.recommended-card,
.article-card,
.help-card,
.doc-card {
  display: block;
  padding: 18px 18px 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.03),
    rgba(255, 255, 255, 0.015)
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.recommended-card:hover,
.article-card:hover,
.help-card:hover,
.doc-card:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 196, 255, 0.18);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.045),
    rgba(255, 255, 255, 0.02)
  );
}

.recommended-card strong,
.article-card strong,
.help-card strong,
.doc-card strong {
  display: block;
  margin-bottom: 8px;
  color: var(--text);
  line-height: 1.4;
}

.recommended-card strong,
.article-card strong {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.recommended-card p,
.article-card p,
.help-card p,
.doc-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.doc-card strong {
  font-size: 18px;
}

/* ========== GitHub Docs 風 ダークスタートページ ========== */

.docs-shell--dark .left-rail--dark {
  background: var(--bg-subtle);
}

.docs-grid--home {
  grid-template-columns: 350px minmax(0, 1fr);
  align-items: stretch;
}

/* ホーム・記事の両方で左レールを sticky の独立スクロールに */
.docs-grid--home > .left-rail,
.docs-grid > .left-rail {
  position: sticky;
  top: 64px;
  align-self: stretch;
  height: calc(100vh - 64px);
  min-height: calc(100vh - 64px);
  overflow-y: auto;
  overflow-x: hidden;
}

.left-rail,
.right-rail .toc,
.markdown-body pre {
  scrollbar-width: thin;
}

/* Firefox */
.left-rail,
.right-rail .toc {
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}

/* WebKit */
.left-rail::-webkit-scrollbar,
.right-rail .toc::-webkit-scrollbar {
  width: 8px;
}

.left-rail::-webkit-scrollbar-track,
.right-rail .toc::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

.left-rail::-webkit-scrollbar-thumb,
.right-rail .toc::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.left-rail::-webkit-scrollbar-thumb:hover,
.right-rail .toc::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.content-rail--home {
  padding: 40px 48px 80px;
}

.docs-home {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 64px;
}

.section-title {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}

/* ヒーロー */
.hero {
  display: grid;
  grid-template-columns: 1fr minmax(200px, 360px);
  gap: 48px;
  align-items: center;
  margin-bottom: 48px;
  padding-bottom: 40px;
  border-bottom: 1px solid var(--line);
}

.hero-text .eyebrow {
  margin-bottom: 8px;
}

.hero-title {
  margin: 0;
  font-size: clamp(32px, 4vw, 42px);
  font-weight: 700;
  line-height: 1.2;
  color: var(--text);
}

.hero-lead {
  margin: 16px 0 0;
  max-width: 560px;
  font-size: 18px;
  line-height: 1.6;
  color: var(--muted);
}

.hero-image-placeholder {
  aspect-ratio: 16/10;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--panel);
  border: 1px dashed var(--line);
  color: var(--muted);
  font-size: 14px;
}

.hero-image-img {
  width: 100%;
  height: auto;
  border-radius: 12px;
  object-fit: cover;
}

/* 推奨カード */
.recommended {
  margin-bottom: 48px;
}

.recommended-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.recommended-card-category {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
}

.recommended-card strong {
  font-size: 17px;
}

.recommended-card p {
  font-size: 14px;
}

/* 記事セクション */
.articles-section {
  margin-bottom: 48px;
}

.articles-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.articles-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-pill,
.pagination-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg);
  color: var(--muted);
  font-size: 13px;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.filter-pill {
  cursor: pointer;
}

.filter-pill:hover,
.pagination-btn:hover:not(:disabled) {
  border-color: #3d444d;
  background: var(--bg-subtle);
  color: var(--text);
}

.filter-pill.active,
.pagination-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--accent);
}

.articles-search {
  min-width: 220px;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.article-card-category {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.article-card strong {
  font-size: 16px;
}

/* ページネーション（モック） */
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.pagination-info {
  font-size: 14px;
  color: var(--muted);
}

.pagination-buttons {
  display: flex;
  gap: 8px;
}

.pagination-btn {
  cursor: pointer;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-page-indicator {
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 13px;
  color: var(--muted);
}

.empty-state {
  padding: 48px 24px;
  text-align: center;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
}

.empty-state strong {
  display: block;
  margin-bottom: 8px;
  color: var(--text);
}

.empty-state p {
  margin: 0;
  color: var(--muted);
}

/* ヘルプセクション */
.help-section {
  padding-top: 40px;
  border-top: 1px solid var(--line);
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.help-card strong {
  font-size: 16px;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-image {
    order: -1;
    max-width: 320px;
  }

  .recommended-grid {
    grid-template-columns: 1fr;
  }
}


.doc-header {
  margin-bottom: 28px;
}

.doc-date {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.markdown-body {
  min-width: 0;
  font-size: 16px;
  line-height: 1.8;
  word-break: break-word;
  overflow-wrap: anywhere;
  background: transparent !important;
}

/* インラインコード（pre 直下以外） */
.markdown-body :not(pre) > code {
  padding: 0.2em 0.4em;
  border-radius: 6px;
  background: rgba(110, 118, 129, 0.22);
  color: #e6edf3;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
    "Liberation Mono", monospace;
  font-size: 0.875em;
}

/* コードブロック外枠 */
.markdown-body pre {
  overflow-x: auto;
  max-width: 100%;
  margin: 0 0 16px;
  padding: 16px 0;
  border: 1px solid #30363d;
  border-radius: 12px;
  background: #0d1117;
}

/* コードブロックの横スクロールバーをダーク対応 */
.markdown-body pre {
  scrollbar-width: thin;
  scrollbar-color: rgba(110, 118, 129, 0.45) #0d1117;
}

.markdown-body pre::-webkit-scrollbar {
  height: 10px;
  width: 10px;
}

.markdown-body pre::-webkit-scrollbar-track {
  background: #0d1117;
  border-radius: 999px;
}

.markdown-body pre::-webkit-scrollbar-thumb {
  background: rgba(110, 118, 129, 0.4);
  border-radius: 999px;
  border: 2px solid #0d1117;
}

.markdown-body pre::-webkit-scrollbar-thumb:hover {
  background: rgba(110, 118, 129, 0.6);
}

.markdown-body pre::-webkit-scrollbar-corner {
  background: #0d1117;
}

/* code 本体（可変ガター付き） */
.markdown-body pre code {
  --code-side-pad: 8px;
  --line-number-width: 3ch;
  --line-number-gap: 6px;
  --code-gutter: calc(var(--line-number-width) + var(--line-number-gap));

  display: grid;
  min-width: max-content;
  background: transparent;
  padding: 0 var(--code-side-pad);
  color: inherit;
  font-size: 0.875em;
  line-height: 1.7;
  counter-reset: line;
  white-space: pre;
}

/* 各行 */
.markdown-body pre code > [data-line] {
  display: block;
  position: relative;
  min-height: 1.7em;
  padding: 0 var(--code-side-pad)
    0 calc(var(--code-gutter) + var(--code-side-pad));
  counter-increment: line;
}

/* 行番号 */
.markdown-body pre code > [data-line]::before {
  content: counter(line);
  position: absolute;
  top: 0;
  left: 0;
  width: var(--line-number-width);
  margin-left: var(--code-side-pad);
  padding-right: var(--line-number-gap);
  color: #6e7681;
  text-align: right;
  user-select: none;
  font-variant-numeric: tabular-nums;
}

/* 空行も高さ維持 */
.markdown-body pre code > [data-line]:empty::after {
  content: " ";
}

/* ハイライト行 */
.markdown-body pre code > [data-highlighted-line] {
  background: rgba(56, 139, 253, 0.14);
  border-left: 2px solid #388bfd;
  padding-left: calc(var(--code-gutter) + var(--code-side-pad) - 2px);
}

.markdown-body pre code > [data-highlighted-line]::before {
  margin-left: calc(var(--code-side-pad) - 2px);
}

/* 単語ハイライト */
.markdown-body pre code [data-highlighted-chars] {
  border-radius: 4px;
  background: rgba(56, 139, 253, 0.18);
  padding: 0.1rem 0.25rem;
}

/* Shiki の inline style 背景だけ無効化 */
.markdown-body pre code span {
  background: transparent !important;
}

.markdown-body .heading-anchor {
  margin-left: 6px;
  color: var(--muted);
  font-size: 0.85em;
  text-decoration: none;
}

.markdown-body .heading-anchor:hover {
  color: var(--accent);
}

/* title / figure 周り */
.markdown-body [data-rehype-pretty-code-figure] {
  margin: 0 0 16px;
}

.markdown-body [data-rehype-pretty-code-figure] pre {
  margin: 0;
}

.markdown-body [data-rehype-pretty-code-title] {
  padding: 10px 14px;
  border: 1px solid #30363d;
  border-bottom: 0;
  background: #161b22;
  color: #c9d1d9;
  font-size: 13px;
}

.markdown-body [data-rehype-pretty-code-title] + pre {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

/* wrapper */
.code-block-wrapper {
  position: relative;
  margin: 0 0 16px;
}

.code-block-wrapper [data-rehype-pretty-code-figure] {
  margin: 0;
}

/* copy button */
.copy-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #30363d;
  border-radius: 8px;
  background: rgba(33, 38, 45, 0.92);
  color: #c9d1d9;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  box-shadow: 0 0 0 1px rgba(48, 54, 61, 0.6);
}

.copy-button:hover {
  background: #30363d;
  border-color: #484f58;
  transform: translateY(-1px);
  box-shadow:
    0 0 0 1px rgba(56, 139, 253, 0.7),
    0 8px 18px rgba(0, 0, 0, 0.45);
}

.copy-button[data-copied="true"] {
  color: #3fb950;
  border-color: rgba(63, 185, 80, 0.45);
}

@media (max-width: 800px) {
  .markdown-body pre code {
    --code-side-pad: 6px;
    --line-number-width: 2ch;
    --line-number-gap: 5px;
  }

  .copy-button {
    top: 8px;
    right: 8px;
    min-width: 56px;

    padding: 0 8px;
    font-size: 11px;
  }
}

/* GitHub Alerts */
.markdown-body .markdown-alert {
  margin: 0 0 16px;
  padding: 0.5rem 1rem;
  border-left: 0.25em solid #3d444d;
  border-radius: 0;
  background: transparent;
  line-height: 1.7;
}

.markdown-body .markdown-alert > :first-child {
  margin-top: 0;
}

.markdown-body .markdown-alert > :last-child {
  margin-bottom: 0;
}

.markdown-body .markdown-alert p {
  margin: 0 0 0.75rem;
}

.markdown-body .markdown-alert p + p {
  margin-top: 0.5rem;
}

.markdown-body .markdown-alert-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.5rem;
  font-weight: 600;
  line-height: 1.25;
  font-size: 1rem;
}

.markdown-body .markdown-alert-title::before {
  content: "";
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  display: inline-block;
  background-color: currentColor;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}

/* NOTE */
.markdown-body .markdown-alert-note {
  border-left-color: #4493f8;
}

.markdown-body .markdown-alert-note .markdown-alert-title {
  color: #4493f8;
}

.markdown-body .markdown-alert-note .markdown-alert-title::before {
  mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/info.svg");
  -webkit-mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/info.svg");
}

/* TIP */
.markdown-body .markdown-alert-tip {
  border-left-color: #3fb950;
}

.markdown-body .markdown-alert-tip .markdown-alert-title {
  color: #3fb950;
}

.markdown-body .markdown-alert-tip .markdown-alert-title::before {
  mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/lightbulb.svg");
  -webkit-mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/lightbulb.svg");
}

/* IMPORTANT */
.markdown-body .markdown-alert-important {
  border-left-color: #ab7df8;
}

.markdown-body .markdown-alert-important .markdown-alert-title {
  color: #ab7df8;
}

.markdown-body .markdown-alert-important .markdown-alert-title::before {
  mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/badge-alert.svg");
  -webkit-mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/badge-alert.svg");
}

/* WARNING */
.markdown-body .markdown-alert-warning {
  border-left-color: #d29922;
}

.markdown-body .markdown-alert-warning .markdown-alert-title {
  color: #d29922;
}

.markdown-body .markdown-alert-warning .markdown-alert-title::before {
  mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/alert-triangle.svg");
  -webkit-mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/alert-triangle.svg");
}

/* CAUTION */
.markdown-body .markdown-alert-caution {
  border-left-color: #f85149;
}

.markdown-body .markdown-alert-caution .markdown-alert-title {
  color: #f85149;
}

.markdown-body .markdown-alert-caution .markdown-alert-title::before {
  mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/octagon-x.svg");
  -webkit-mask-image: url("https://cdn.jsdelivr.net/npm/lucide-static/icons/octagon-x.svg");
}

.markdown-body blockquote {
  margin: 0 0 16px;
  padding: 0 16px;
  border-left: 4px solid var(--line);
  color: var(--muted);
}

@media (max-width: 1080px) {
  .docs-grid {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .right-rail {
    display: none;
  }
}

@media (max-width: 800px) {
  .topbar {
    padding: 0 16px;
  }

  .docs-grid {
    grid-template-columns: 1fr;
  }

  .left-rail {
    display: none;
  }

  .content-rail {
    padding: 28px 20px 64px;
  }

  .toc-mobile {
    display: block;
  }

  .search-box {
    max-width: 220px;
  }

  .content-rail--home {
    padding: 28px 20px 64px;
  }

  .articles-header,
  .articles-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .articles-search {
    min-width: 0;
  }
}

/* ===== 最小差分: 記事ページ検索 & パンくず ===== */
.topbar-search-area {
  position: relative;
  width: min(420px, 100%);
}

.topbar-search-area .search-box {
  width: 100%;
}

.topbar-search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 30;
  display: grid;
  gap: 6px;
  max-height: 320px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  overflow-y: auto;
}

.topbar-search-result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.topbar-search-result:hover {
  background: rgba(255, 255, 255, 0.035);
  border-color: transparent;
}

.topbar-search-result strong {
  font-size: 14px;
  line-height: 1.4;
}

.topbar-search-result span,
.topbar-search-empty {
  color: var(--muted);
  font-size: 12px;
}

.topbar-search-empty {
  padding: 10px 12px;
}

.breadcrumbs ol {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
  color: var(--muted);
  font-size: 13px;
}

.breadcrumbs li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.breadcrumbs li:not(:first-child)::before {
  content: "/";
  color: rgba(148, 163, 184, 0.5);
}

.breadcrumbs a {
  color: var(--muted);
}

.breadcrumbs a:hover {
  color: var(--text);
}

@media (max-width: 800px) {
  .topbar-search-area {
    width: min(220px, 100%);
  }
}
```

---

## `app/layout.tsx`

```tsx
import "./globals.css";
import "github-markdown-css/github-markdown-dark.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Docs",
  description: "GitHub Docs inspired template",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

---

## `app/page.tsx`

```tsx
import { getPosts } from "@/lib/posts";
import { DocsHomeShell } from "@/components/docs-home-shell";

export default function HomePage() {
  const posts = getPosts();
  return <DocsHomeShell posts={posts} />;
}
```

---

## `components/docs-home-shell.tsx`

```tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DocsSidebar } from "@/components/docs-sidebar";
import { SearchBox } from "@/components/search-box";
import { DocsHome } from "@/components/docs-home";
import type { PostMeta } from "@/lib/posts";

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
            <img src="/freepik__text-to-image__24694.png" alt="" />
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
```

---

## `components/docs-home.tsx`

```tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PostMeta } from "@/lib/posts";

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
            src="/freepik__text-to-image__26502.png"
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
```

---

## `components/docs-layout.tsx`

```tsx
 "use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsToc } from "@/components/docs-toc";
import { SearchBox } from "@/components/search-box";
import type { PostMeta } from "@/lib/posts";
import type { Heading } from "@/lib/markdown";

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

  const segments = currentSlug.split("/").filter(Boolean);

  return (
    <div className="docs-shell docs-shell--dark">
      <header className="topbar topbar--dark">
        <Link href="/" className="topbar-brand" prefetch={false}>
          <span className="topbar-logo" aria-hidden="true">
            <img src="/freepik__text-to-image__24694.png" alt="" />
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
              role="listbox"
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

          {children}
        </main>

        <aside className="right-rail">
          <DocsToc headings={headings} />
        </aside>
      </div>
    </div>
  );
}
```

---

## `components/docs-sidebar.tsx`

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import type { PostMeta } from "@/lib/posts";

type TreeNode = {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  childOrder: string[];
  post?: PostMeta;
};

function createNode(name: string, path: string): TreeNode {
  return {
    name,
    path,
    children: new Map(),
    childOrder: [],
  };
}

function buildTree(posts: PostMeta[]): TreeNode {
  const root = createNode("root", "");

  for (const post of posts) {
    let current = root;
    let currentPath = "";

    post.slug.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!current.children.has(segment)) {
        current.children.set(segment, createNode(segment, currentPath));
        current.childOrder.push(segment);
      }

      current = current.children.get(segment)!;

      if (index === post.slug.length - 1) {
        current.post = post;
      }
    });
  }

  return root;
}

function hasActiveDescendant(node: TreeNode, currentSlug: string): boolean {
  if (node.post?.slugAsPath === currentSlug) return true;

  for (const key of node.childOrder) {
    const child = node.children.get(key);
    if (child && hasActiveDescendant(child, currentSlug)) return true;
  }

  return false;
}

function orderedChildren(node: TreeNode): TreeNode[] {
  return node.childOrder
    .map((key) => node.children.get(key))
    .filter(Boolean) as TreeNode[];
}

function renderNodes(
  nodes: TreeNode[],
  currentSlug: string,
  level = 0
): ReactNode {
  return (
    <ul className={level === 0 ? "sidebar-list" : "sidebar-children"}>
      {nodes.map((node) => {
        const isLeaf = node.children.size === 0 && node.post;
        const active = node.post?.slugAsPath === currentSlug;
        const open = hasActiveDescendant(node, currentSlug);

        if (isLeaf) {
          return (
            <li key={node.path}>
              <Link
                href={`/docs/${node.post!.slugAsPath}/`}
                prefetch={false}
                className={active ? "active" : ""}
                title={node.post!.title}
                aria-current={active ? "page" : undefined}
              >
                <span className="sidebar-link-text">{node.post!.title}</span>
              </Link>
            </li>
          );
        }

        return (
          <li key={node.path} className="sidebar-accordion">
            <details className="sidebar-details" open={open}>
              <summary className="sidebar-summary">
                <span className="sidebar-summary-label" title={node.name}>
                  {node.name}
                </span>
                <span className="sidebar-summary-icon" aria-hidden />
              </summary>

              {renderNodes(orderedChildren(node), currentSlug, level + 1)}
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function DocsSidebar({
  posts,
  currentSlug,
}: {
  posts: PostMeta[];
  currentSlug: string;
}) {
  const tree = buildTree(posts);
  const rootNodes = orderedChildren(tree);

  return (
    <nav className="sidebar">
      <Link href="/" className="sidebar-back" prefetch={false}>
        ← ホーム
      </Link>

      <p className="sidebar-title">Get started</p>

      {renderNodes(rootNodes, currentSlug)}
    </nav>
  );
}
```

---

## `components/docs-toc.tsx`

```tsx
 "use client";

import type { Heading } from "@/lib/markdown";
import { useEffect, useMemo, useState } from "react";

export function DocsToc({
  headings,
  variant = "desktop",
}: {
  headings: Heading[];
  variant?: "desktop" | "mobile";
}) {
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ids.length) return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).offsetTop -
              (b.target as HTMLElement).offsetTop
          );
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      {
        root: null,
        rootMargin: "-30% 0px -60% 0px",
        threshold: [0, 1],
      }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [ids]);

  function TocList() {
    return (
      <ul>
        {headings.map((heading) => {
          const isActive = heading.id === activeId;
          return (
            <li key={heading.id} className={`level-${heading.level}`}>
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => {
                  setActiveId(heading.id);
                  if (variant === "mobile") setMobileOpen(false);
                }}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  if (variant === "mobile") {
    if (!headings.length) return null;
    return (
      <details
        className="toc-mobile-details"
        open={mobileOpen}
        onToggle={(e) =>
          setMobileOpen((e.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary className="toc-mobile-summary">このページの内容</summary>
        <div className="toc toc--mobile">
          <TocList />
        </div>
      </details>
    );
  }

  return (
    <div className="toc">
      <p className="toc-title">このページの内容</p>
      <TocList />
    </div>
  );
}
```

---

## `components/search-box.tsx`

```tsx
import type React from "react";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

export function SearchBox({
  value = "",
  onChange,
  placeholder = "検索する",
  disabled = false,
  onKeyDown,
}: Props) {
  return (
    <label className="search-box" aria-label="記事を検索">
      <span className="search-icon" aria-hidden />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}
```

---

## `lib/markdown.ts`

```ts
import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";
import type { Root as HastRoot, Element as HastElement } from "hast";
import type { Root as MdastRoot, Blockquote, Paragraph, Text } from "mdast";

const ALERT_META: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  NOTE: { label: "Note", className: "markdown-alert-note" },
  TIP: { label: "Tip", className: "markdown-alert-tip" },
  IMPORTANT: { label: "Important", className: "markdown-alert-important" },
  WARNING: { label: "Warning", className: "markdown-alert-warning" },
  CAUTION: { label: "Caution", className: "markdown-alert-caution" },
};

function remarkGitHubAlerts() {
  return (tree: MdastRoot) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0];
      if (!first || first.type !== "paragraph") return;

      const firstParagraph = first as Paragraph;
      const firstChild = firstParagraph.children[0];
      if (!firstChild || firstChild.type !== "text") return;

      const textNode = firstChild as Text;
      const match = textNode.value.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/
      );

      if (!match) return;

      const alertType = match[1];
      const meta = ALERT_META[alertType];
      if (!meta) return;

      textNode.value = textNode.value.replace(match[0], "").trimStart();

      if (textNode.value.length === 0) {
        firstParagraph.children.shift();
      }

      while (
        firstParagraph.children.length > 0 &&
        firstParagraph.children[0].type === "break"
      ) {
        firstParagraph.children.shift();
      }

      if (firstParagraph.children.length === 0) {
        node.children.shift();
      }

      (node.data ??= {}).hName = "div";
      (node.data ??= {}).hProperties = {
        className: ["markdown-alert", meta.className],
      };

      node.children.unshift({
        type: "paragraph",
        data: {
          hName: "p",
          hProperties: {
            className: ["markdown-alert-title"],
          },
        },
        children: [
          {
            type: "text",
            value: meta.label,
          },
        ],
      } as Paragraph);
    });
  };
}

function rehypeExternalLinks() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: HastElement) => {
      if (node.tagName !== "a") return;

      const href = node.properties?.href;
      if (typeof href !== "string") return;
      if (href.startsWith("/") || href.startsWith("#")) return;

      node.properties = {
        ...node.properties,
        target: "_blank",
        rel: ["noreferrer", "noopener"],
      };
    });
  };
}

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  clobberPrefix: "user-content-",
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    "*": [
      ...(((defaultSchema.attributes as any)?.["*"] as any[]) ?? []),
      "id",
      "className",
      "title",
      "ariaLabel",
      "ariaCurrent",
      "ariaHidden",
      "role",
      /^data-[\w-]+$/i,
    ],
    a: [
      ...(((defaultSchema.attributes as any)?.a as any[]) ?? []),
      "href",
      "target",
      "rel",
    ],
    code: [
      ...(((defaultSchema.attributes as any)?.code as any[]) ?? []),
      "className",
    ],
    pre: [
      ...(((defaultSchema.attributes as any)?.pre as any[]) ?? []),
      "className",
    ],
    span: [
      ...(((defaultSchema.attributes as any)?.span as any[]) ?? []),
      "className",
    ],
    div: [
      ...(((defaultSchema.attributes as any)?.div as any[]) ?? []),
      "className",
    ],
    p: [
      ...(((defaultSchema.attributes as any)?.p as any[]) ?? []),
      "className",
    ],
    h2: [
      ...(((defaultSchema.attributes as any)?.h2 as any[]) ?? []),
      "id",
      "className",
    ],
    h3: [
      ...(((defaultSchema.attributes as any)?.h3 as any[]) ?? []),
      "id",
      "className",
    ],
    h4: [
      ...(((defaultSchema.attributes as any)?.h4 as any[]) ?? []),
      "id",
      "className",
    ],
  },
};

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkGitHubAlerts)
    .use(remarkRehype, {
      allowDangerousHtml: true,
    })
    .use(rehypeRaw)
    .use(rehypeSanitize, SANITIZE_SCHEMA)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: {
        ariaLabel: "見出しへのリンク",
        className: ["heading-anchor"],
      },
      content: {
        type: "text",
        value: "#",
      },
    })
    .use(rehypeExternalLinks)
    .use(rehypePrettyCode, {
      theme: "github-dark-default",
      keepBackground: false,
      defaultLang: "text",
    })
    .use(rehypeStringify, {
      allowDangerousHtml: true,
    })
    .process(markdown);

  return result.toString();
}

export type Heading = {
  level: number;
  text: string;
  id: string;
};

export function extractHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();

  return markdown
    .split("\n")
    .filter((line) => /^##\s+/.test(line) || /^###\s+/.test(line))
    .map((line) => {
      const level = line.startsWith("###") ? 3 : 2;
      const text = line.replace(/^###?\s+/, "").trim();
      const id = slugger.slug(text);

      return { level, text, id };
    });
}
```

---

## `lib/posts.ts`

```ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type PostMeta = {
  slug: string[];
  slugAsPath: string;
  title: string;
  description?: string;
  category?: string;
  date?: string;
  order?: number;
};

export type Post = PostMeta & {
  content: string;
};

const postsDirectory = path.join(process.cwd(), "posts");

function getMarkdownFiles(dir: string, baseDir = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return getMarkdownFiles(fullPath, baseDir);
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      return [path.relative(baseDir, fullPath)];
    }

    return [];
  });
}

export function getPosts(): PostMeta[] {
  const files = getMarkdownFiles(postsDirectory);

  return files
    .map((relativePath) => {
      const fullPath = path.join(postsDirectory, relativePath);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      const slugAsPath = relativePath.replace(/\.md$/, "").replace(/\\/g, "/");
      const slug = slugAsPath.split("/");

      return {
        slug,
        slugAsPath,
        title: data.title ?? slug[slug.length - 1],
        description: data.description ?? "",
        category: data.category ?? slug[0] ?? "Docs",
        date: data.date ?? "",
        order:
          typeof data.order === "number"
            ? data.order
            : typeof data.order === "string" && data.order.trim()
              ? Number(data.order)
              : undefined,
      };
    })
    .sort((a, b) => {
      const aDate = a.date ? Date.parse(a.date) : NaN;
      const bDate = b.date ? Date.parse(b.date) : NaN;
      const aHasDate = Number.isFinite(aDate);
      const bHasDate = Number.isFinite(bDate);
      if (aHasDate && bHasDate && aDate !== bDate) return bDate - aDate;
      if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;

      const aCat = a.slug[0] ?? "";
      const bCat = b.slug[0] ?? "";
      const catCmp = aCat.localeCompare(bCat, "ja");
      if (catCmp !== 0) return catCmp;

      const aDepth = a.slug.length;
      const bDepth = b.slug.length;
      if (aDepth !== bDepth) return aDepth - bDepth;

      const aOrder = typeof a.order === "number" && Number.isFinite(a.order) ? a.order : Infinity;
      const bOrder = typeof b.order === "number" && Number.isFinite(b.order) ? b.order : Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const pathCmp = a.slugAsPath.localeCompare(b.slugAsPath, "ja");
      if (pathCmp !== 0) return pathCmp;

      return a.title.localeCompare(b.title, "ja");
    });
}

export function getPostBySlug(slugParts: string[]): Post | undefined {
  const fullPath = path.join(postsDirectory, ...slugParts) + ".md";
  if (!fs.existsSync(fullPath)) return undefined;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: slugParts,
    slugAsPath: slugParts.join("/"),
    title: data.title ?? slugParts[slugParts.length - 1],
    description: data.description ?? "",
    category: data.category ?? slugParts[0] ?? "Docs",
    date: data.date ?? "",
    order:
      typeof data.order === "number"
        ? data.order
        : typeof data.order === "string" && data.order.trim()
          ? Number(data.order)
          : undefined,
    content,
  };
}
```

---

## `next.config.ts`

```ts
import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";
const repo = "Pastel"; // リポジトリ名（GitHub: Vserval/Pastel）

// npm run dev をプロジェクトフォルダで実行している前提で、ここをルートにする
const projectRoot = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}/` : "",
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
```

---

## `package.json`

```json
{
  "name": "my-dev-blog",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "github-markdown-css": "^5.9.0",
    "github-slugger": "^2.0.0",
    "gray-matter": "^4.0.3",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "rehype-autolink-headings": "^7.1.0",
    "rehype-pretty-code": "^0.14.3",
    "rehype-raw": "^7.0.0",
    "rehype-sanitize": "^6.0.0",
    "rehype-slug": "^6.0.0",
    "rehype-stringify": "^10.0.1",
    "remark": "^15.0.1",
    "remark-breaks": "^4.0.0",
    "remark-gfm": "^4.0.1",
    "remark-html": "^16.0.1",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.1.2",
    "shiki": "^4.0.2",
    "unist-util-visit": "^5.1.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## `posts/Backend/API/Concepts/article-0.md`

```md
---
title: "【認証】まとめ"

description: "認証 に関する まとめ のダミー記事です。（自動生成 #134）"

category: "Backend"

date: "2025-12-22"
---

# 認証 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/API/Concepts/article-1.md`

```md
---
title: "【ルーティング】パフォーマンス最適化"

description: "ルーティング に関する パフォーマンス最適化 のダミー記事です。（自動生成 #135）"

category: "Backend"

date: "2025-10-07"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/API/Patterns/article-0.md`

```md
---
title: "デプロイ の ベストプラクティス"

description: "デプロイ に関する ベストプラクティス のダミー記事です。（自動生成 #136）"

category: "Backend"

date: "2026-02-05"
---

# デプロイ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/API/Patterns/article-1.md`

```md
---
title: "スタイリング 入門: 応用"

description: "スタイリング に関する 応用 のダミー記事です。（自動生成 #137）"

category: "Backend"

date: "2025-03-30"
---

# スタイリング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/API/Setup/article-0.md`

```md
---
title: "状態管理 の メモ"

description: "状態管理 に関する メモ のダミー記事です。（自動生成 #132）"

category: "Backend"

date: "2025-07-16"
---

# 状態管理 について

この記事では、状態管理 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/API/Setup/article-1.md`

```md
---
title: "メモ - アクセシビリティ (133)"

description: "アクセシビリティ に関する メモ のダミー記事です。（自動生成 #133）"

category: "Backend"

date: "2025-03-22"
---

# アクセシビリティ について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/API/item-0.md`

```md
---
title: "応用 - ルーティング"

description: "ルーティング に関する 応用 のダミー記事です。（自動生成 #46）"

category: "Backend"

date: "2025-09-15"
---

# ルーティング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/API/item-1.md`

```md
---
title: "【デプロイ】よくある質問"

description: "デプロイ に関する よくある質問 のダミー記事です。（自動生成 #47）"

category: "Backend"

date: "2025-04-05"
---

# デプロイ について

この記事では、デプロイ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Concepts/DeepDive/Part1/index.md`

```md
---
title: "よくある質問 - 認証"

description: "認証 に関する よくある質問 のダミー記事です。（自動生成 #270）"

category: "Backend"

date: "2025-08-15"
---

# 認証 について

この記事では、認証 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Concepts/DeepDive/Part2/index.md`

```md
---
title: "認証 入門: ベストプラクティス"

description: "認証 に関する ベストプラクティス のダミー記事です。（自動生成 #271）"

category: "Backend"

date: "2025-04-09"
---

# 認証 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Concepts/DeepDive/readme.md`

```md
---
title: "【型安全】基礎"

description: "型安全 に関する 基礎 のダミー記事です。（自動生成 #213）"

category: "Backend"

date: "2025-11-15"
---

# 型安全 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Concepts/Intro/Part1/index.md`

```md
---
title: "【デプロイ】応用"

description: "デプロイ に関する 応用 のダミー記事です。（自動生成 #268）"

category: "Backend"

date: "2025-04-14"
---

# デプロイ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Concepts/Intro/Part2/index.md`

```md
---
title: "ベストプラクティス - スタイリング"

description: "スタイリング に関する ベストプラクティス のダミー記事です。（自動生成 #269）"

category: "Backend"

date: "2025-11-19"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Concepts/Intro/readme.md`

```md
---
title: "セットアップ手順 - 認証"

description: "認証 に関する セットアップ手順 のダミー記事です。（自動生成 #212）"

category: "Backend"

date: "2025-10-04"
---

# 認証 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Concepts/article-0.md`

```md
---
title: "ベストプラクティス - データ取得"

description: "データ取得 に関する ベストプラクティス のダミー記事です。（自動生成 #122）"

category: "Backend"

date: "2026-03-01"
---

# データ取得 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Concepts/article-1.md`

```md
---
title: "セットアップ手順 - 認証"

description: "認証 に関する セットアップ手順 のダミー記事です。（自動生成 #123）"

category: "Backend"

date: "2025-12-21"
---

# 認証 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Patterns/DeepDive/readme.md`

```md
---
title: "ルーティング の よくある質問"

description: "ルーティング に関する よくある質問 のダミー記事です。（自動生成 #215）"

category: "Backend"

date: "2025-03-25"
---

# ルーティング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Patterns/Intro/readme.md`

```md
---
title: "【スタイリング】比較検証"

description: "スタイリング に関する 比較検証 のダミー記事です。（自動生成 #214）"

category: "Backend"

date: "2025-08-05"
---

# スタイリング について

この記事では、スタイリング について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Patterns/article-0.md`

```md
---
title: "【状態管理】パフォーマンス最適化"

description: "状態管理 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #124）"

category: "Backend"

date: "2025-08-26"
---

# 状態管理 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Patterns/article-1.md`

```md
---
title: "【アクセシビリティ】セットアップ手順"

description: "アクセシビリティ に関する セットアップ手順 のダミー記事です。（自動生成 #125）"

category: "Backend"

date: "2026-02-01"
---

# アクセシビリティ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Setup/DeepDive/Part1/index.md`

```md
---
title: "データ取得 入門: パフォーマンス最適化 (266)"

description: "データ取得 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #266）"

category: "Backend"

date: "2025-09-01"
---

# データ取得 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Setup/DeepDive/Part2/index.md`

```md
---
title: "チュートリアル - 型安全"

description: "型安全 に関する チュートリアル のダミー記事です。（自動生成 #267）"

category: "Backend"

date: "2025-06-30"
---

# 型安全 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Setup/DeepDive/readme.md`

```md
---
title: "リファレンス - データ取得"

description: "データ取得 に関する リファレンス のダミー記事です。（自動生成 #211）"

category: "Backend"

date: "2025-04-17"
---

# データ取得 について

この記事では、データ取得 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Setup/Intro/Part1/index.md`

```md
---
title: "比較検証 - テスト"

description: "テスト に関する 比較検証 のダミー記事です。（自動生成 #264）"

category: "Backend"

date: "2026-02-06"
---

# テスト について

この記事では、テスト について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Setup/Intro/Part2/index.md`

```md
---
title: "認証 の パフォーマンス最適化"

description: "認証 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #265）"

category: "Backend"

date: "2026-02-10"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Setup/Intro/readme.md`

```md
---
title: "デプロイ の セットアップ手順 (210)"

description: "デプロイ に関する セットアップ手順 のダミー記事です。（自動生成 #210）"

category: "Backend"

date: "2026-02-05"
---

# デプロイ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Setup/article-0.md`

```md
---
title: "テスト 入門: 基礎"

description: "テスト に関する 基礎 のダミー記事です。（自動生成 #120）"

category: "Backend"

date: "2025-10-14"
---

# テスト について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/Setup/article-1.md`

```md
---
title: "デプロイ の トラブルシューティング"

description: "デプロイ に関する トラブルシューティング のダミー記事です。（自動生成 #121）"

category: "Backend"

date: "2025-07-09"
---

# デプロイ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/item-0.md`

```md
---
title: "【コンポーネント】メモ (42)"

description: "コンポーネント に関する メモ のダミー記事です。（自動生成 #42）"

category: "Backend"

date: "2026-02-27"
---

# コンポーネント について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Advanced/item-1.md`

```md
---
title: "ルーティング の トラブルシューティング"

description: "ルーティング に関する トラブルシューティング のダミー記事です。（自動生成 #43）"

category: "Backend"

date: "2025-10-24"
---

# ルーティング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Concepts/DeepDive/Part1/index.md`

```md
---
title: "アクセシビリティ 入門: 基礎"

description: "アクセシビリティ に関する 基礎 のダミー記事です。（自動生成 #262）"

category: "Backend"

date: "2025-07-24"
---

# アクセシビリティ について

この記事では、アクセシビリティ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Concepts/DeepDive/Part2/index.md`

```md
---
title: "よくある質問 - コンポーネント"

description: "コンポーネント に関する よくある質問 のダミー記事です。（自動生成 #263）"

category: "Backend"

date: "2025-08-09"
---

# コンポーネント について

この記事では、コンポーネント について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Concepts/DeepDive/readme.md`

```md
---
title: "デプロイ の セットアップ手順"

description: "デプロイ に関する セットアップ手順 のダミー記事です。（自動生成 #207）"

category: "Backend"

date: "2025-07-05"
---

# デプロイ について

この記事では、デプロイ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Concepts/Intro/Part1/index.md`

```md
---
title: "よくある質問 - ルーティング"

description: "ルーティング に関する よくある質問 のダミー記事です。（自動生成 #260）"

category: "Backend"

date: "2025-09-11"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Concepts/Intro/Part2/index.md`

```md
---
title: "応用 - アクセシビリティ"

description: "アクセシビリティ に関する 応用 のダミー記事です。（自動生成 #261）"

category: "Backend"

date: "2025-07-01"
---

# アクセシビリティ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Concepts/Intro/readme.md`

```md
---
title: "リファレンス - コンポーネント"

description: "コンポーネント に関する リファレンス のダミー記事です。（自動生成 #206）"

category: "Backend"

date: "2025-03-19"
---

# コンポーネント について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Concepts/article-0.md`

```md
---
title: "スタイリング の ベストプラクティス"

description: "スタイリング に関する ベストプラクティス のダミー記事です。（自動生成 #116）"

category: "Backend"

date: "2025-03-19"
---

# スタイリング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Concepts/article-1.md`

```md
---
title: "ベストプラクティス - ルーティング"

description: "ルーティング に関する ベストプラクティス のダミー記事です。（自動生成 #117）"

category: "Backend"

date: "2025-09-27"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Patterns/DeepDive/readme.md`

```md
---
title: "トラブルシューティング - ルーティング"

description: "ルーティング に関する トラブルシューティング のダミー記事です。（自動生成 #209）"

category: "Backend"

date: "2026-03-08"
---

# ルーティング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Patterns/Intro/readme.md`

```md
---
title: "状態管理 入門: トラブルシューティング"

description: "状態管理 に関する トラブルシューティング のダミー記事です。（自動生成 #208）"

category: "Backend"

date: "2026-01-23"
---

# 状態管理 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Patterns/article-0.md`

```md
---
title: "【テスト】ベストプラクティス"

description: "テスト に関する ベストプラクティス のダミー記事です。（自動生成 #118）"

category: "Backend"

date: "2025-11-30"
---

# テスト について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Patterns/article-1.md`

```md
---
title: "【デプロイ】パフォーマンス最適化 (119)"

description: "デプロイ に関する パフォーマンス最適化 のダミー記事です。（自動生成 #119）"

category: "Backend"

date: "2025-05-25"
---

# デプロイ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Setup/DeepDive/Part1/index.md`

```md
---
title: "認証 の 基礎"

description: "認証 に関する 基礎 のダミー記事です。（自動生成 #258）"

category: "Backend"

date: "2025-10-31"
---

# 認証 について

この記事では、認証 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Setup/DeepDive/Part2/index.md`

```md
---
title: "比較検証 - 状態管理 (259)"

description: "状態管理 に関する 比較検証 のダミー記事です。（自動生成 #259）"

category: "Backend"

date: "2025-06-19"
---

# 状態管理 について

この記事では、状態管理 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Setup/DeepDive/readme.md`

```md
---
title: "パフォーマンス最適化 - スタイリング"

description: "スタイリング に関する パフォーマンス最適化 のダミー記事です。（自動生成 #205）"

category: "Backend"

date: "2025-11-16"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Setup/Intro/Part1/index.md`

```md
---
title: "型安全 の チュートリアル"

description: "型安全 に関する チュートリアル のダミー記事です。（自動生成 #256）"

category: "Backend"

date: "2026-01-18"
---

# 型安全 について

この記事では、型安全 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Setup/Intro/Part2/index.md`

```md
---
title: "状態管理 入門: 基礎"

description: "状態管理 に関する 基礎 のダミー記事です。（自動生成 #257）"

category: "Backend"

date: "2025-11-14"
---

# 状態管理 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Setup/Intro/readme.md`

```md
---
title: "ベストプラクティス - 型安全"

description: "型安全 に関する ベストプラクティス のダミー記事です。（自動生成 #204）"

category: "Backend"

date: "2025-10-02"
---

# 型安全 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Setup/article-0.md`

```md
---
title: "ルーティング 入門: 比較検証"

description: "ルーティング に関する 比較検証 のダミー記事です。（自動生成 #114）"

category: "Backend"

date: "2025-11-15"
---

# ルーティング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/Setup/article-1.md`

```md
---
title: "【認証】リファレンス"

description: "認証 に関する リファレンス のダミー記事です。（自動生成 #115）"

category: "Backend"

date: "2026-01-04"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/item-0.md`

```md
---
title: "スタイリング 入門: 応用"

description: "スタイリング に関する 応用 のダミー記事です。（自動生成 #40）"

category: "Backend"

date: "2026-03-05"
---

# スタイリング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Basics/item-1.md`

```md
---
title: "型安全 の メモ"

description: "型安全 に関する メモ のダミー記事です。（自動生成 #41）"

category: "Backend"

date: "2026-03-12"
---

# 型安全 について

この記事では、型安全 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Guides/item-0.md`

```md
---
title: "コンポーネント 入門: ベストプラクティス"

description: "コンポーネント に関する ベストプラクティス のダミー記事です。（自動生成 #48）"

category: "Backend"

date: "2026-01-19"
---

# コンポーネント について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Guides/item-1.md`

```md
---
title: "メモ - スタイリング (49)"

description: "スタイリング に関する メモ のダミー記事です。（自動生成 #49）"

category: "Backend"

date: "2026-01-03"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Concepts/DeepDive/readme.md`

```md
---
title: "パフォーマンス最適化 - ルーティング"

description: "ルーティング に関する パフォーマンス最適化 のダミー記事です。（自動生成 #219）"

category: "Backend"

date: "2025-05-02"
---

# ルーティング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Concepts/Intro/readme.md`

```md
---
title: "型安全 の ベストプラクティス"

description: "型安全 に関する ベストプラクティス のダミー記事です。（自動生成 #218）"

category: "Backend"

date: "2025-12-18"
---

# 型安全 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Concepts/article-0.md`

```md
---
title: "認証 入門: ベストプラクティス"

description: "認証 に関する ベストプラクティス のダミー記事です。（自動生成 #128）"

category: "Backend"

date: "2025-08-12"
---

# 認証 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Concepts/article-1.md`

```md
---
title: "【ルーティング】よくある質問"

description: "ルーティング に関する よくある質問 のダミー記事です。（自動生成 #129）"

category: "Backend"

date: "2025-06-12"
---

# ルーティング について

この記事では、ルーティング について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Patterns/DeepDive/readme.md`

```md
---
title: "データ取得 入門: よくある質問"

description: "データ取得 に関する よくある質問 のダミー記事です。（自動生成 #221）"

category: "Backend"

date: "2025-04-08"
---

# データ取得 について

この記事では、データ取得 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Patterns/Intro/readme.md`

```md
---
title: "テスト の パフォーマンス最適化"

description: "テスト に関する パフォーマンス最適化 のダミー記事です。（自動生成 #220）"

category: "Backend"

date: "2025-11-17"
---

# テスト について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Patterns/article-0.md`

```md
---
title: "【認証】メモ"

description: "認証 に関する メモ のダミー記事です。（自動生成 #130）"

category: "Backend"

date: "2025-04-16"
---

# 認証 について

この記事では、認証 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Patterns/article-1.md`

```md
---
title: "コンポーネント の メモ"

description: "コンポーネント に関する メモ のダミー記事です。（自動生成 #131）"

category: "Backend"

date: "2026-03-05"
---

# コンポーネント について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Setup/DeepDive/readme.md`

```md
---
title: "リファレンス - 認証 (217)"

description: "認証 に関する リファレンス のダミー記事です。（自動生成 #217）"

category: "Backend"

date: "2025-12-31"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Setup/Intro/readme.md`

```md
---
title: "コンポーネント 入門: 基礎"

description: "コンポーネント に関する 基礎 のダミー記事です。（自動生成 #216）"

category: "Backend"

date: "2026-02-15"
---

# コンポーネント について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Setup/article-0.md`

```md
---
title: "状態管理 の よくある質問 (126)"

description: "状態管理 に関する よくある質問 のダミー記事です。（自動生成 #126）"

category: "Backend"

date: "2026-02-18"
---

# 状態管理 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/Setup/article-1.md`

```md
---
title: "デプロイ の リファレンス"

description: "デプロイ に関する リファレンス のダミー記事です。（自動生成 #127）"

category: "Backend"

date: "2025-07-26"
---

# デプロイ について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/item-0.md`

```md
---
title: "スタイリング の トラブルシューティング"

description: "スタイリング に関する トラブルシューティング のダミー記事です。（自動生成 #44）"

category: "Backend"

date: "2025-05-27"
---

# スタイリング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/Recipes/item-1.md`

```md
---
title: "メモ - テスト"

description: "テスト に関する メモ のダミー記事です。（自動生成 #45）"

category: "Backend"

date: "2025-08-19"
---

# テスト について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/post-backend-0.md`

```md
---
title: "ルーティング の メモ"

description: "ルーティング に関する メモ のダミー記事です。（自動生成 #3）"

category: "Backend"

date: "2025-06-30"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/post-backend-1.md`

```md
---
title: "コンポーネント の トラブルシューティング"

description: "コンポーネント に関する トラブルシューティング のダミー記事です。（自動生成 #4）"

category: "Backend"

date: "2025-04-17"
---

# コンポーネント について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Backend/post-backend-2.md`

```md
---
title: "メモ - デプロイ"

description: "デプロイ に関する メモ のダミー記事です。（自動生成 #5）"

category: "Backend"

date: "2025-05-18"
---

# デプロイ について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/API/item-0.md`

```md
---
title: "【型安全】基礎"

description: "型安全 に関する 基礎 のダミー記事です。（自動生成 #76）"

category: "CSS"

date: "2026-02-05"
---

# 型安全 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/API/item-1.md`

```md
---
title: "型安全 入門: 基礎 (77)"

description: "型安全 に関する 基礎 のダミー記事です。（自動生成 #77）"

category: "CSS"

date: "2025-05-21"
---

# 型安全 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/Advanced/item-0.md`

```md
---
title: "認証 入門: メモ"

description: "認証 に関する メモ のダミー記事です。（自動生成 #72）"

category: "CSS"

date: "2025-06-30"
---

# 認証 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/Advanced/item-1.md`

```md
---
title: "【データ取得】基礎"

description: "データ取得 に関する 基礎 のダミー記事です。（自動生成 #73）"

category: "CSS"

date: "2025-04-25"
---

# データ取得 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/Basics/item-0.md`

```md
---
title: "【状態管理】チュートリアル (70)"

description: "状態管理 に関する チュートリアル のダミー記事です。（自動生成 #70）"

category: "CSS"

date: "2026-01-20"
---

# 状態管理 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/Basics/item-1.md`

```md
---
title: "状態管理 入門: チュートリアル"

description: "状態管理 に関する チュートリアル のダミー記事です。（自動生成 #71）"

category: "CSS"

date: "2025-05-10"
---

# 状態管理 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/Guides/item-0.md`

```md
---
title: "状態管理 の ベストプラクティス"

description: "状態管理 に関する ベストプラクティス のダミー記事です。（自動生成 #78）"

category: "CSS"

date: "2026-02-22"
---

# 状態管理 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/Guides/item-1.md`

```md
---
title: "認証 入門: 基礎"

description: "認証 に関する 基礎 のダミー記事です。（自動生成 #79）"

category: "CSS"

date: "2025-11-28"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/Recipes/item-0.md`

```md
---
title: "【データ取得】基礎"

description: "データ取得 に関する 基礎 のダミー記事です。（自動生成 #74）"

category: "CSS"

date: "2025-09-26"
---

# データ取得 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/Recipes/item-1.md`

```md
---
title: "まとめ - データ取得"

description: "データ取得 に関する まとめ のダミー記事です。（自動生成 #75）"

category: "CSS"

date: "2025-06-06"
---

# データ取得 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/post-css-0.md`

```md
---
title: "コンポーネント の セットアップ手順"

description: "コンポーネント に関する セットアップ手順 のダミー記事です。（自動生成 #12）"

category: "CSS"

date: "2025-10-18"
---

# コンポーネント について

この記事では、コンポーネント について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/post-css-1.md`

```md
---
title: "応用 - スタイリング"

description: "スタイリング に関する 応用 のダミー記事です。（自動生成 #13）"

category: "CSS"

date: "2025-10-24"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/CSS/post-css-2.md`

```md
---
title: "認証 入門: まとめ (14)"

description: "認証 に関する まとめ のダミー記事です。（自動生成 #14）"

category: "CSS"

date: "2025-09-15"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/API/Concepts/article-0.md`

```md
---
title: "データ取得 入門: メモ"

description: "データ取得 に関する メモ のダミー記事です。（自動生成 #158）"

category: "DevOps"

date: "2025-12-14"
---

# データ取得 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/API/Concepts/article-1.md`

```md
---
title: "コンポーネント の 比較検証"

description: "コンポーネント に関する 比較検証 のダミー記事です。（自動生成 #159）"

category: "DevOps"

date: "2025-10-26"
---

# コンポーネント について

この記事では、コンポーネント について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/API/Patterns/article-0.md`

```md
---
title: "コンポーネント 入門: トラブルシューティング"

description: "コンポーネント に関する トラブルシューティング のダミー記事です。（自動生成 #160）"

category: "DevOps"

date: "2025-03-23"
---

# コンポーネント について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/API/Patterns/article-1.md`

```md
---
title: "【テスト】応用 (161)"

description: "テスト に関する 応用 のダミー記事です。（自動生成 #161）"

category: "DevOps"

date: "2025-05-26"
---

# テスト について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/API/Setup/article-0.md`

```md
---
title: "ルーティング の 比較検証"

description: "ルーティング に関する 比較検証 のダミー記事です。（自動生成 #156）"

category: "DevOps"

date: "2025-12-07"
---

# ルーティング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/API/Setup/article-1.md`

```md
---
title: "テスト 入門: チュートリアル"

description: "テスト に関する チュートリアル のダミー記事です。（自動生成 #157）"

category: "DevOps"

date: "2026-01-23"
---

# テスト について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/API/item-0.md`

```md
---
title: "テスト の まとめ (56)"

description: "テスト に関する まとめ のダミー記事です。（自動生成 #56）"

category: "DevOps"

date: "2025-10-15"
---

# テスト について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/API/item-1.md`

```md
---
title: "【コンポーネント】パフォーマンス最適化"

description: "コンポーネント に関する パフォーマンス最適化 のダミー記事です。（自動生成 #57）"

category: "DevOps"

date: "2025-10-06"
---

# コンポーネント について

この記事では、コンポーネント について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Concepts/DeepDive/readme.md`

```md
---
title: "チュートリアル - コンポーネント (231)"

description: "コンポーネント に関する チュートリアル のダミー記事です。（自動生成 #231）"

category: "DevOps"

date: "2026-02-26"
---

# コンポーネント について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Concepts/Intro/readme.md`

```md
---
title: "アクセシビリティ の チュートリアル"

description: "アクセシビリティ に関する チュートリアル のダミー記事です。（自動生成 #230）"

category: "DevOps"

date: "2025-04-28"
---

# アクセシビリティ について

この記事では、アクセシビリティ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Concepts/article-0.md`

```md
---
title: "テスト の リファレンス"

description: "テスト に関する リファレンス のダミー記事です。（自動生成 #146）"

category: "DevOps"

date: "2025-07-09"
---

# テスト について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Concepts/article-1.md`

```md
---
title: "認証 入門: チュートリアル (147)"

description: "認証 に関する チュートリアル のダミー記事です。（自動生成 #147）"

category: "DevOps"

date: "2025-10-23"
---

# 認証 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Patterns/DeepDive/readme.md`

```md
---
title: "比較検証 - 認証"

description: "認証 に関する 比較検証 のダミー記事です。（自動生成 #233）"

category: "DevOps"

date: "2025-12-16"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Patterns/Intro/readme.md`

```md
---
title: "認証 の 比較検証"

description: "認証 に関する 比較検証 のダミー記事です。（自動生成 #232）"

category: "DevOps"

date: "2026-01-28"
---

# 認証 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Patterns/article-0.md`

```md
---
title: "【データ取得】トラブルシューティング"

description: "データ取得 に関する トラブルシューティング のダミー記事です。（自動生成 #148）"

category: "DevOps"

date: "2025-06-24"
---

# データ取得 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Patterns/article-1.md`

```md
---
title: "メモ - ルーティング"

description: "ルーティング に関する メモ のダミー記事です。（自動生成 #149）"

category: "DevOps"

date: "2025-07-08"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Setup/DeepDive/readme.md`

```md
---
title: "データ取得 入門: メモ"

description: "データ取得 に関する メモ のダミー記事です。（自動生成 #229）"

category: "DevOps"

date: "2025-11-23"
---

# データ取得 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Setup/Intro/readme.md`

```md
---
title: "【アクセシビリティ】セットアップ手順"

description: "アクセシビリティ に関する セットアップ手順 のダミー記事です。（自動生成 #228）"

category: "DevOps"

date: "2025-05-09"
---

# アクセシビリティ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Setup/article-0.md`

```md
---
title: "【認証】メモ"

description: "認証 に関する メモ のダミー記事です。（自動生成 #144）"

category: "DevOps"

date: "2025-10-24"
---

# 認証 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/Setup/article-1.md`

```md
---
title: "よくある質問 - スタイリング"

description: "スタイリング に関する よくある質問 のダミー記事です。（自動生成 #145）"

category: "DevOps"

date: "2025-09-24"
---

# スタイリング について

この記事では、スタイリング について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/item-0.md`

```md
---
title: "コンポーネント の 応用"

description: "コンポーネント に関する 応用 のダミー記事です。（自動生成 #52）"

category: "DevOps"

date: "2025-12-20"
---

# コンポーネント について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Advanced/item-1.md`

```md
---
title: "テスト の よくある質問"

description: "テスト に関する よくある質問 のダミー記事です。（自動生成 #53）"

category: "DevOps"

date: "2025-08-22"
---

# テスト について

この記事では、テスト について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Concepts/DeepDive/readme.md`

```md
---
title: "テスト の 応用"

description: "テスト に関する 応用 のダミー記事です。（自動生成 #225）"

category: "DevOps"

date: "2025-09-01"
---

# テスト について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Concepts/Intro/readme.md`

```md
---
title: "データ取得 入門: よくある質問 (224)"

description: "データ取得 に関する よくある質問 のダミー記事です。（自動生成 #224）"

category: "DevOps"

date: "2025-12-04"
---

# データ取得 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Concepts/article-0.md`

```md
---
title: "基礎 - 認証 (140)"

description: "認証 に関する 基礎 のダミー記事です。（自動生成 #140）"

category: "DevOps"

date: "2025-07-08"
---

# 認証 について

この記事では、認証 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Concepts/article-1.md`

```md
---
title: "リファレンス - デプロイ"

description: "デプロイ に関する リファレンス のダミー記事です。（自動生成 #141）"

category: "DevOps"

date: "2025-03-18"
---

# デプロイ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Patterns/DeepDive/readme.md`

```md
---
title: "セットアップ手順 - コンポーネント"

description: "コンポーネント に関する セットアップ手順 のダミー記事です。（自動生成 #227）"

category: "DevOps"

date: "2025-10-26"
---

# コンポーネント について

この記事では、コンポーネント について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Patterns/Intro/readme.md`

```md
---
title: "認証 入門: パフォーマンス最適化"

description: "認証 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #226）"

category: "DevOps"

date: "2025-03-22"
---

# 認証 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Patterns/article-0.md`

```md
---
title: "デプロイ 入門: まとめ"

description: "デプロイ に関する まとめ のダミー記事です。（自動生成 #142）"

category: "DevOps"

date: "2025-05-04"
---

# デプロイ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Patterns/article-1.md`

```md
---
title: "よくある質問 - テスト"

description: "テスト に関する よくある質問 のダミー記事です。（自動生成 #143）"

category: "DevOps"

date: "2025-05-16"
---

# テスト について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Setup/DeepDive/readme.md`

```md
---
title: "認証 入門: パフォーマンス最適化"

description: "認証 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #223）"

category: "DevOps"

date: "2025-04-22"
---

# 認証 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Setup/Intro/readme.md`

```md
---
title: "テスト の チュートリアル"

description: "テスト に関する チュートリアル のダミー記事です。（自動生成 #222）"

category: "DevOps"

date: "2026-02-06"
---

# テスト について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Setup/article-0.md`

```md
---
title: "【ルーティング】パフォーマンス最適化"

description: "ルーティング に関する パフォーマンス最適化 のダミー記事です。（自動生成 #138）"

category: "DevOps"

date: "2025-09-19"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/Setup/article-1.md`

```md
---
title: "デプロイ 入門: セットアップ手順"

description: "デプロイ に関する セットアップ手順 のダミー記事です。（自動生成 #139）"

category: "DevOps"

date: "2026-02-08"
---

# デプロイ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/item-0.md`

```md
---
title: "チュートリアル - 状態管理"

description: "状態管理 に関する チュートリアル のダミー記事です。（自動生成 #50）"

category: "DevOps"

date: "2025-11-08"
---

# 状態管理 について

この記事では、状態管理 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Basics/item-1.md`

```md
---
title: "【テスト】トラブルシューティング"

description: "テスト に関する トラブルシューティング のダミー記事です。（自動生成 #51）"

category: "DevOps"

date: "2026-02-18"
---

# テスト について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Guides/item-0.md`

```md
---
title: "パフォーマンス最適化 - コンポーネント"

description: "コンポーネント に関する パフォーマンス最適化 のダミー記事です。（自動生成 #58）"

category: "DevOps"

date: "2025-07-01"
---

# コンポーネント について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Guides/item-1.md`

```md
---
title: "【状態管理】基礎"

description: "状態管理 に関する 基礎 のダミー記事です。（自動生成 #59）"

category: "DevOps"

date: "2025-12-10"
---

# 状態管理 について

この記事では、状態管理 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Concepts/DeepDive/readme.md`

```md
---
title: "セットアップ手順 - スタイリング"

description: "スタイリング に関する セットアップ手順 のダミー記事です。（自動生成 #237）"

category: "DevOps"

date: "2025-06-03"
---

# スタイリング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Concepts/Intro/readme.md`

```md
---
title: "応用 - 認証"

description: "認証 に関する 応用 のダミー記事です。（自動生成 #236）"

category: "DevOps"

date: "2026-02-05"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Concepts/article-0.md`

```md
---
title: "デプロイ の 比較検証"

description: "デプロイ に関する 比較検証 のダミー記事です。（自動生成 #152）"

category: "DevOps"

date: "2025-10-10"
---

# デプロイ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Concepts/article-1.md`

```md
---
title: "認証 入門: よくある質問"

description: "認証 に関する よくある質問 のダミー記事です。（自動生成 #153）"

category: "DevOps"

date: "2025-08-10"
---

# 認証 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Patterns/DeepDive/readme.md`

```md
---
title: "ルーティング 入門: よくある質問"

description: "ルーティング に関する よくある質問 のダミー記事です。（自動生成 #239）"

category: "DevOps"

date: "2025-04-05"
---

# ルーティング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Patterns/Intro/readme.md`

```md
---
title: "【ルーティング】ベストプラクティス (238)"

description: "ルーティング に関する ベストプラクティス のダミー記事です。（自動生成 #238）"

category: "DevOps"

date: "2025-10-31"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Patterns/article-0.md`

```md
---
title: "リファレンス - 認証 (154)"

description: "認証 に関する リファレンス のダミー記事です。（自動生成 #154）"

category: "DevOps"

date: "2025-10-28"
---

# 認証 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Patterns/article-1.md`

```md
---
title: "【データ取得】メモ"

description: "データ取得 に関する メモ のダミー記事です。（自動生成 #155）"

category: "DevOps"

date: "2025-12-07"
---

# データ取得 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Setup/DeepDive/readme.md`

```md
---
title: "データ取得 入門: まとめ"

description: "データ取得 に関する まとめ のダミー記事です。（自動生成 #235）"

category: "DevOps"

date: "2025-07-12"
---

# データ取得 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Setup/Intro/readme.md`

```md
---
title: "状態管理 入門: トラブルシューティング"

description: "状態管理 に関する トラブルシューティング のダミー記事です。（自動生成 #234）"

category: "DevOps"

date: "2025-06-17"
---

# 状態管理 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Setup/article-0.md`

```md
---
title: "比較検証 - スタイリング"

description: "スタイリング に関する 比較検証 のダミー記事です。（自動生成 #150）"

category: "DevOps"

date: "2025-04-19"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/Setup/article-1.md`

```md
---
title: "【テスト】基礎"

description: "テスト に関する 基礎 のダミー記事です。（自動生成 #151）"

category: "DevOps"

date: "2025-10-16"
---

# テスト について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/item-0.md`

```md
---
title: "【状態管理】ベストプラクティス"

description: "状態管理 に関する ベストプラクティス のダミー記事です。（自動生成 #54）"

category: "DevOps"

date: "2025-08-28"
---

# 状態管理 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/Recipes/item-1.md`

```md
---
title: "チュートリアル - テスト"

description: "テスト に関する チュートリアル のダミー記事です。（自動生成 #55）"

category: "DevOps"

date: "2025-03-24"
---

# テスト について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/post-devops-0.md`

```md
---
title: "まとめ - コンポーネント"

description: "コンポーネント に関する まとめ のダミー記事です。（自動生成 #6）"

category: "DevOps"

date: "2025-09-22"
---

# コンポーネント について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/post-devops-1.md`

```md
---
title: "状態管理 入門: メモ (7)"

description: "状態管理 に関する メモ のダミー記事です。（自動生成 #7）"

category: "DevOps"

date: "2026-01-22"
---

# 状態管理 について

この記事では、状態管理 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/DevOps/post-devops-2.md`

```md
---
title: "デプロイ 入門: 応用"

description: "デプロイ に関する 応用 のダミー記事です。（自動生成 #8）"

category: "DevOps"

date: "2025-09-20"
---

# デプロイ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/API/Concepts/article-0.md`

```md
---
title: "型安全 入門: トラブルシューティング"

description: "型安全 に関する トラブルシューティング のダミー記事です。（自動生成 #110）"

category: "Frontend"

date: "2025-08-01"
---

# 型安全 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/API/Concepts/article-1.md`

```md
---
title: "ベストプラクティス - 型安全"

description: "型安全 に関する ベストプラクティス のダミー記事です。（自動生成 #111）"

category: "Frontend"

date: "2025-12-24"
---

# 型安全 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/API/Patterns/article-0.md`

```md
---
title: "テスト の チュートリアル (112)"

description: "テスト に関する チュートリアル のダミー記事です。（自動生成 #112）"

category: "Frontend"

date: "2025-04-23"
---

# テスト について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/API/Patterns/article-1.md`

```md
---
title: "型安全 の よくある質問"

description: "型安全 に関する よくある質問 のダミー記事です。（自動生成 #113）"

category: "Frontend"

date: "2025-10-26"
---

# 型安全 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/API/Setup/article-0.md`

```md
---
title: "まとめ - スタイリング"

description: "スタイリング に関する まとめ のダミー記事です。（自動生成 #108）"

category: "Frontend"

date: "2026-02-18"
---

# スタイリング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/API/Setup/article-1.md`

```md
---
title: "応用 - スタイリング"

description: "スタイリング に関する 応用 のダミー記事です。（自動生成 #109）"

category: "Frontend"

date: "2026-01-06"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/API/item-0.md`

```md
---
title: "まとめ - 状態管理"

description: "状態管理 に関する まとめ のダミー記事です。（自動生成 #36）"

category: "Frontend"

date: "2025-06-07"
---

# 状態管理 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/API/item-1.md`

```md
---
title: "トラブルシューティング - データ取得"

description: "データ取得 に関する トラブルシューティング のダミー記事です。（自動生成 #37）"

category: "Frontend"

date: "2025-11-27"
---

# データ取得 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Concepts/DeepDive/Part1/index.md`

```md
---
title: "アクセシビリティ の メモ"

description: "アクセシビリティ に関する メモ のダミー記事です。（自動生成 #254）"

category: "Frontend"

date: "2025-09-28"
---

# アクセシビリティ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Concepts/DeepDive/Part2/index.md`

```md
---
title: "アクセシビリティ 入門: 基礎"

description: "アクセシビリティ に関する 基礎 のダミー記事です。（自動生成 #255）"

category: "Frontend"

date: "2025-12-31"
---

# アクセシビリティ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Concepts/DeepDive/readme.md`

```md
---
title: "トラブルシューティング - コンポーネント"

description: "コンポーネント に関する トラブルシューティング のダミー記事です。（自動生成 #195）"

category: "Frontend"

date: "2026-01-27"
---

# コンポーネント について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Concepts/Intro/Part1/index.md`

```md
---
title: "コンポーネント 入門: 基礎 (252)"

description: "コンポーネント に関する 基礎 のダミー記事です。（自動生成 #252）"

category: "Frontend"

date: "2025-11-11"
---

# コンポーネント について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Concepts/Intro/Part2/index.md`

```md
---
title: "【アクセシビリティ】メモ"

description: "アクセシビリティ に関する メモ のダミー記事です。（自動生成 #253）"

category: "Frontend"

date: "2025-06-05"
---

# アクセシビリティ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Concepts/Intro/readme.md`

```md
---
title: "アクセシビリティ の メモ"

description: "アクセシビリティ に関する メモ のダミー記事です。（自動生成 #194）"

category: "Frontend"

date: "2025-10-07"
---

# アクセシビリティ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Concepts/article-0.md`

```md
---
title: "状態管理 入門: パフォーマンス最適化 (98)"

description: "状態管理 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #98）"

category: "Frontend"

date: "2025-08-20"
---

# 状態管理 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Concepts/article-1.md`

```md
---
title: "コンポーネント 入門: チュートリアル"

description: "コンポーネント に関する チュートリアル のダミー記事です。（自動生成 #99）"

category: "Frontend"

date: "2025-11-28"
---

# コンポーネント について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Patterns/DeepDive/readme.md`

```md
---
title: "テスト 入門: 比較検証"

description: "テスト に関する 比較検証 のダミー記事です。（自動生成 #197）"

category: "Frontend"

date: "2025-06-28"
---

# テスト について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Patterns/Intro/readme.md`

```md
---
title: "【ルーティング】よくある質問 (196)"

description: "ルーティング に関する よくある質問 のダミー記事です。（自動生成 #196）"

category: "Frontend"

date: "2025-04-18"
---

# ルーティング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Patterns/article-0.md`

```md
---
title: "アクセシビリティ 入門: パフォーマンス最適化"

description: "アクセシビリティ に関する パフォーマンス最適化 のダミー記事です。（自動生成 #100）"

category: "Frontend"

date: "2025-07-20"
---

# アクセシビリティ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Patterns/article-1.md`

```md
---
title: "テスト の セットアップ手順"

description: "テスト に関する セットアップ手順 のダミー記事です。（自動生成 #101）"

category: "Frontend"

date: "2025-06-27"
---

# テスト について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Setup/DeepDive/Part1/index.md`

```md
---
title: "コンポーネント 入門: ベストプラクティス"

description: "コンポーネント に関する ベストプラクティス のダミー記事です。（自動生成 #250）"

category: "Frontend"

date: "2025-12-08"
---

# コンポーネント について

この記事では、コンポーネント について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Setup/DeepDive/Part2/index.md`

```md
---
title: "テスト の 応用"

description: "テスト に関する 応用 のダミー記事です。（自動生成 #251）"

category: "Frontend"

date: "2025-04-21"
---

# テスト について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Setup/DeepDive/readme.md`

```md
---
title: "よくある質問 - データ取得"

description: "データ取得 に関する よくある質問 のダミー記事です。（自動生成 #193）"

category: "Frontend"

date: "2026-01-12"
---

# データ取得 について

この記事では、データ取得 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Setup/Intro/Part1/index.md`

```md
---
title: "メモ - 認証"

description: "認証 に関する メモ のダミー記事です。（自動生成 #248）"

category: "Frontend"

date: "2025-07-31"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Setup/Intro/Part2/index.md`

```md
---
title: "認証 入門: 応用"

description: "認証 に関する 応用 のダミー記事です。（自動生成 #249）"

category: "Frontend"

date: "2025-06-10"
---

# 認証 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Setup/Intro/readme.md`

```md
---
title: "コンポーネント 入門: メモ"

description: "コンポーネント に関する メモ のダミー記事です。（自動生成 #192）"

category: "Frontend"

date: "2025-06-07"
---

# コンポーネント について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Setup/article-0.md`

```md
---
title: "リファレンス - デプロイ"

description: "デプロイ に関する リファレンス のダミー記事です。（自動生成 #96）"

category: "Frontend"

date: "2025-03-24"
---

# デプロイ について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/Setup/article-1.md`

```md
---
title: "型安全 の まとめ"

description: "型安全 に関する まとめ のダミー記事です。（自動生成 #97）"

category: "Frontend"

date: "2025-08-12"
---

# 型安全 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/item-0.md`

```md
---
title: "【型安全】トラブルシューティング"

description: "型安全 に関する トラブルシューティング のダミー記事です。（自動生成 #32）"

category: "Frontend"

date: "2025-05-13"
---

# 型安全 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Advanced/item-1.md`

```md
---
title: "【テスト】基礎"

description: "テスト に関する 基礎 のダミー記事です。（自動生成 #33）"

category: "Frontend"

date: "2025-09-11"
---

# テスト について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Concepts/DeepDive/Part1/index.md`

```md
---
title: "型安全 の ベストプラクティス"

description: "型安全 に関する ベストプラクティス のダミー記事です。（自動生成 #246）"

category: "Frontend"

date: "2025-08-15"
---

# 型安全 について

この記事では、型安全 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Concepts/DeepDive/Part2/index.md`

```md
---
title: "パフォーマンス最適化 - テスト"

description: "テスト に関する パフォーマンス最適化 のダミー記事です。（自動生成 #247）"

category: "Frontend"

date: "2025-10-23"
---

# テスト について

この記事では、テスト について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Concepts/DeepDive/readme.md`

```md
---
title: "【ルーティング】ベストプラクティス (189)"

description: "ルーティング に関する ベストプラクティス のダミー記事です。（自動生成 #189）"

category: "Frontend"

date: "2025-04-13"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Concepts/Intro/Part1/index.md`

```md
---
title: "【データ取得】よくある質問"

description: "データ取得 に関する よくある質問 のダミー記事です。（自動生成 #244）"

category: "Frontend"

date: "2026-01-25"
---

# データ取得 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Concepts/Intro/Part2/index.md`

```md
---
title: "まとめ - 型安全 (245)"

description: "型安全 に関する まとめ のダミー記事です。（自動生成 #245）"

category: "Frontend"

date: "2025-07-26"
---

# 型安全 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Concepts/Intro/readme.md`

```md
---
title: "テスト 入門: 応用"

description: "テスト に関する 応用 のダミー記事です。（自動生成 #188）"

category: "Frontend"

date: "2025-11-06"
---

# テスト について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Concepts/article-0.md`

```md
---
title: "基礎 - データ取得"

description: "データ取得 に関する 基礎 のダミー記事です。（自動生成 #92）"

category: "Frontend"

date: "2026-03-15"
---

# データ取得 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Concepts/article-1.md`

```md
---
title: "型安全 の セットアップ手順"

description: "型安全 に関する セットアップ手順 のダミー記事です。（自動生成 #93）"

category: "Frontend"

date: "2025-09-10"
---

# 型安全 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Patterns/DeepDive/readme.md`

```md
---
title: "パフォーマンス最適化 - 認証"

description: "認証 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #191）"

category: "Frontend"

date: "2025-04-29"
---

# 認証 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Patterns/Intro/readme.md`

```md
---
title: "【テスト】ベストプラクティス"

description: "テスト に関する ベストプラクティス のダミー記事です。（自動生成 #190）"

category: "Frontend"

date: "2025-12-09"
---

# テスト について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Patterns/article-0.md`

```md
---
title: "ルーティング 入門: セットアップ手順"

description: "ルーティング に関する セットアップ手順 のダミー記事です。（自動生成 #94）"

category: "Frontend"

date: "2025-04-30"
---

# ルーティング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Patterns/article-1.md`

```md
---
title: "ルーティング 入門: 比較検証"

description: "ルーティング に関する 比較検証 のダミー記事です。（自動生成 #95）"

category: "Frontend"

date: "2025-06-29"
---

# ルーティング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Setup/DeepDive/Part1/index.md`

```md
---
title: "セットアップ手順 - ルーティング"

description: "ルーティング に関する セットアップ手順 のダミー記事です。（自動生成 #242）"

category: "Frontend"

date: "2025-03-22"
---

# ルーティング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Setup/DeepDive/Part2/index.md`

```md
---
title: "デプロイ の 応用"

description: "デプロイ に関する 応用 のダミー記事です。（自動生成 #243）"

category: "Frontend"

date: "2026-02-20"
---

# デプロイ について

この記事では、デプロイ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Setup/DeepDive/readme.md`

```md
---
title: "セットアップ手順 - データ取得"

description: "データ取得 に関する セットアップ手順 のダミー記事です。（自動生成 #187）"

category: "Frontend"

date: "2025-06-07"
---

# データ取得 について

この記事では、データ取得 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Setup/Intro/Part1/index.md`

```md
---
title: "アクセシビリティ 入門: ベストプラクティス"

description: "アクセシビリティ に関する ベストプラクティス のダミー記事です。（自動生成 #240）"

category: "Frontend"

date: "2026-01-19"
---

# アクセシビリティ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Setup/Intro/Part2/index.md`

```md
---
title: "テスト 入門: 基礎"

description: "テスト に関する 基礎 のダミー記事です。（自動生成 #241）"

category: "Frontend"

date: "2025-05-07"
---

# テスト について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Setup/Intro/readme.md`

```md
---
title: "リファレンス - 状態管理"

description: "状態管理 に関する リファレンス のダミー記事です。（自動生成 #186）"

category: "Frontend"

date: "2025-03-25"
---

# 状態管理 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Setup/article-0.md`

```md
---
title: "デプロイ 入門: リファレンス"

description: "デプロイ に関する リファレンス のダミー記事です。（自動生成 #90）"

category: "Frontend"

date: "2025-08-04"
---

# デプロイ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/Setup/article-1.md`

```md
---
title: "応用 - 型安全 (91)"

description: "型安全 に関する 応用 のダミー記事です。（自動生成 #91）"

category: "Frontend"

date: "2025-05-24"
---

# 型安全 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/item-0.md`

```md
---
title: "型安全 入門: 応用"

description: "型安全 に関する 応用 のダミー記事です。（自動生成 #30）"

category: "Frontend"

date: "2025-04-22"
---

# 型安全 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Basics/item-1.md`

```md
---
title: "アクセシビリティ の メモ"

description: "アクセシビリティ に関する メモ のダミー記事です。（自動生成 #31）"

category: "Frontend"

date: "2025-09-05"
---

# アクセシビリティ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Guides/item-0.md`

```md
---
title: "スタイリング 入門: 比較検証"

description: "スタイリング に関する 比較検証 のダミー記事です。（自動生成 #38）"

category: "Frontend"

date: "2025-08-23"
---

# スタイリング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Guides/item-1.md`

```md
---
title: "トラブルシューティング - テスト"

description: "テスト に関する トラブルシューティング のダミー記事です。（自動生成 #39）"

category: "Frontend"

date: "2026-01-13"
---

# テスト について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Concepts/DeepDive/readme.md`

```md
---
title: "デプロイ 入門: リファレンス"

description: "デプロイ に関する リファレンス のダミー記事です。（自動生成 #201）"

category: "Frontend"

date: "2026-03-14"
---

# デプロイ について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Concepts/Intro/readme.md`

```md
---
title: "型安全 の 比較検証"

description: "型安全 に関する 比較検証 のダミー記事です。（自動生成 #200）"

category: "Frontend"

date: "2026-02-08"
---

# 型安全 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Concepts/article-0.md`

```md
---
title: "スタイリング の メモ"

description: "スタイリング に関する メモ のダミー記事です。（自動生成 #104）"

category: "Frontend"

date: "2026-03-03"
---

# スタイリング について

この記事では、スタイリング について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Concepts/article-1.md`

```md
---
title: "【スタイリング】よくある質問 (105)"

description: "スタイリング に関する よくある質問 のダミー記事です。（自動生成 #105）"

category: "Frontend"

date: "2025-07-25"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Patterns/DeepDive/readme.md`

```md
---
title: "型安全 入門: よくある質問 (203)"

description: "型安全 に関する よくある質問 のダミー記事です。（自動生成 #203）"

category: "Frontend"

date: "2025-09-26"
---

# 型安全 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Patterns/Intro/readme.md`

```md
---
title: "パフォーマンス最適化 - データ取得"

description: "データ取得 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #202）"

category: "Frontend"

date: "2025-12-29"
---

# データ取得 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Patterns/article-0.md`

```md
---
title: "メモ - アクセシビリティ"

description: "アクセシビリティ に関する メモ のダミー記事です。（自動生成 #106）"

category: "Frontend"

date: "2025-07-05"
---

# アクセシビリティ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Patterns/article-1.md`

```md
---
title: "【スタイリング】まとめ"

description: "スタイリング に関する まとめ のダミー記事です。（自動生成 #107）"

category: "Frontend"

date: "2026-01-20"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Setup/DeepDive/readme.md`

```md
---
title: "まとめ - 型安全"

description: "型安全 に関する まとめ のダミー記事です。（自動生成 #199）"

category: "Frontend"

date: "2025-12-08"
---

# 型安全 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Setup/Intro/readme.md`

```md
---
title: "よくある質問 - デプロイ"

description: "デプロイ に関する よくある質問 のダミー記事です。（自動生成 #198）"

category: "Frontend"

date: "2025-11-11"
---

# デプロイ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Setup/article-0.md`

```md
---
title: "【状態管理】セットアップ手順"

description: "状態管理 に関する セットアップ手順 のダミー記事です。（自動生成 #102）"

category: "Frontend"

date: "2025-10-21"
---

# 状態管理 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/Setup/article-1.md`

```md
---
title: "【アクセシビリティ】リファレンス"

description: "アクセシビリティ に関する リファレンス のダミー記事です。（自動生成 #103）"

category: "Frontend"

date: "2025-11-15"
---

# アクセシビリティ について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/item-0.md`

```md
---
title: "スタイリング の 基礎"

description: "スタイリング に関する 基礎 のダミー記事です。（自動生成 #34）"

category: "Frontend"

date: "2025-05-29"
---

# スタイリング について

この記事では、スタイリング について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/Recipes/item-1.md`

```md
---
title: "比較検証 - ルーティング (35)"

description: "ルーティング に関する 比較検証 のダミー記事です。（自動生成 #35）"

category: "Frontend"

date: "2026-02-08"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/post-frontend-0.md`

```md
---
title: "ルーティング 入門: 基礎 (0)"

description: "ルーティング に関する 基礎 のダミー記事です。（自動生成 #0）"

category: "Frontend"

date: "2025-11-10"
---

# ルーティング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/post-frontend-1.md`

```md
---
title: "【状態管理】比較検証"

description: "状態管理 に関する 比較検証 のダミー記事です。（自動生成 #1）"

category: "Frontend"

date: "2025-04-03"
---

# 状態管理 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Frontend/post-frontend-2.md`

```md
---
title: "パフォーマンス最適化 - ルーティング"

description: "ルーティング に関する パフォーマンス最適化 のダミー記事です。（自動生成 #2）"

category: "Frontend"

date: "2026-02-27"
---

# ルーティング について

この記事では、ルーティング について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/API/Concepts/article-0.md`

```md
---
title: "アクセシビリティ 入門: 基礎 (182)"

description: "アクセシビリティ に関する 基礎 のダミー記事です。（自動生成 #182）"

category: "Houdini"

date: "2025-05-24"
---

# アクセシビリティ について

この記事では、アクセシビリティ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/API/Concepts/article-1.md`

```md
---
title: "よくある質問 - 状態管理"

description: "状態管理 に関する よくある質問 のダミー記事です。（自動生成 #183）"

category: "Houdini"

date: "2025-10-24"
---

# 状態管理 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/API/Patterns/article-0.md`

```md
---
title: "ベストプラクティス - アクセシビリティ"

description: "アクセシビリティ に関する ベストプラクティス のダミー記事です。（自動生成 #184）"

category: "Houdini"

date: "2026-01-28"
---

# アクセシビリティ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/API/Patterns/article-1.md`

```md
---
title: "認証 入門: ベストプラクティス"

description: "認証 に関する ベストプラクティス のダミー記事です。（自動生成 #185）"

category: "Houdini"

date: "2025-10-02"
---

# 認証 について

この記事では、認証 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/API/Setup/article-0.md`

```md
---
title: "基礎 - アクセシビリティ"

description: "アクセシビリティ に関する 基礎 のダミー記事です。（自動生成 #180）"

category: "Houdini"

date: "2025-10-01"
---

# アクセシビリティ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/API/Setup/article-1.md`

```md
---
title: "【データ取得】基礎"

description: "データ取得 に関する 基礎 のダミー記事です。（自動生成 #181）"

category: "Houdini"

date: "2025-11-18"
---

# データ取得 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/API/item-0.md`

```md
---
title: "スタイリング 入門: トラブルシューティング"

description: "スタイリング に関する トラブルシューティング のダミー記事です。（自動生成 #66）"

category: "Houdini"

date: "2026-01-07"
---

# スタイリング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/API/item-1.md`

```md
---
title: "ルーティング 入門: メモ"

description: "ルーティング に関する メモ のダミー記事です。（自動生成 #67）"

category: "Houdini"

date: "2025-10-21"
---

# ルーティング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Advanced/Concepts/article-0.md`

```md
---
title: "【データ取得】セットアップ手順"

description: "データ取得 に関する セットアップ手順 のダミー記事です。（自動生成 #170）"

category: "Houdini"

date: "2025-12-25"
---

# データ取得 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Advanced/Concepts/article-1.md`

```md
---
title: "【状態管理】トラブルシューティング"

description: "状態管理 に関する トラブルシューティング のダミー記事です。（自動生成 #171）"

category: "Houdini"

date: "2025-12-25"
---

# 状態管理 について

この記事では、状態管理 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Advanced/Patterns/article-0.md`

```md
---
title: "よくある質問 - デプロイ"

description: "デプロイ に関する よくある質問 のダミー記事です。（自動生成 #172）"

category: "Houdini"

date: "2025-10-17"
---

# デプロイ について

この記事では、デプロイ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Advanced/Patterns/article-1.md`

```md
---
title: "スタイリング 入門: チュートリアル"

description: "スタイリング に関する チュートリアル のダミー記事です。（自動生成 #173）"

category: "Houdini"

date: "2025-03-21"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Advanced/Setup/article-0.md`

```md
---
title: "パフォーマンス最適化 - データ取得 (168)"

description: "データ取得 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #168）"

category: "Houdini"

date: "2025-10-10"
---

# データ取得 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Advanced/Setup/article-1.md`

```md
---
title: "【アクセシビリティ】基礎"

description: "アクセシビリティ に関する 基礎 のダミー記事です。（自動生成 #169）"

category: "Houdini"

date: "2025-11-29"
---

# アクセシビリティ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Advanced/item-0.md`

```md
---
title: "デプロイ 入門: セットアップ手順"

description: "デプロイ に関する セットアップ手順 のダミー記事です。（自動生成 #62）"

category: "Houdini"

date: "2025-11-02"
---

# デプロイ について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Advanced/item-1.md`

```md
---
title: "認証 入門: メモ (63)"

description: "認証 に関する メモ のダミー記事です。（自動生成 #63）"

category: "Houdini"

date: "2025-08-25"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Basics/Concepts/article-0.md`

```md
---
title: "【デプロイ】よくある質問"

description: "デプロイ に関する よくある質問 のダミー記事です。（自動生成 #164）"

category: "Houdini"

date: "2025-05-24"
---

# デプロイ について

この記事では、デプロイ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Basics/Concepts/article-1.md`

```md
---
title: "状態管理 入門: まとめ"

description: "状態管理 に関する まとめ のダミー記事です。（自動生成 #165）"

category: "Houdini"

date: "2026-01-31"
---

# 状態管理 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Basics/Patterns/article-0.md`

```md
---
title: "トラブルシューティング - ルーティング"

description: "ルーティング に関する トラブルシューティング のダミー記事です。（自動生成 #166）"

category: "Houdini"

date: "2025-05-09"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Basics/Patterns/article-1.md`

```md
---
title: "メモ - アクセシビリティ"

description: "アクセシビリティ に関する メモ のダミー記事です。（自動生成 #167）"

category: "Houdini"

date: "2025-07-28"
---

# アクセシビリティ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Basics/Setup/article-0.md`

```md
---
title: "よくある質問 - テスト"

description: "テスト に関する よくある質問 のダミー記事です。（自動生成 #162）"

category: "Houdini"

date: "2025-09-22"
---

# テスト について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Basics/Setup/article-1.md`

```md
---
title: "チュートリアル - コンポーネント"

description: "コンポーネント に関する チュートリアル のダミー記事です。（自動生成 #163）"

category: "Houdini"

date: "2026-01-16"
---

# コンポーネント について

この記事では、コンポーネント について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Basics/item-0.md`

```md
---
title: "アクセシビリティ の 応用"

description: "アクセシビリティ に関する 応用 のダミー記事です。（自動生成 #60）"

category: "Houdini"

date: "2025-08-21"
---

# アクセシビリティ について

この記事では、アクセシビリティ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Basics/item-1.md`

```md
---
title: "【アクセシビリティ】メモ"

description: "アクセシビリティ に関する メモ のダミー記事です。（自動生成 #61）"

category: "Houdini"

date: "2025-05-02"
---

# アクセシビリティ について

この記事では、アクセシビリティ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Guides/item-0.md`

```md
---
title: "テスト 入門: トラブルシューティング"

description: "テスト に関する トラブルシューティング のダミー記事です。（自動生成 #68）"

category: "Houdini"

date: "2025-05-06"
---

# テスト について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Guides/item-1.md`

```md
---
title: "コンポーネント 入門: セットアップ手順"

description: "コンポーネント に関する セットアップ手順 のダミー記事です。（自動生成 #69）"

category: "Houdini"

date: "2025-04-10"
---

# コンポーネント について

この記事では、コンポーネント について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Recipes/Concepts/article-0.md`

```md
---
title: "状態管理 の チュートリアル"

description: "状態管理 に関する チュートリアル のダミー記事です。（自動生成 #176）"

category: "Houdini"

date: "2026-02-07"
---

# 状態管理 について

この記事では、状態管理 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Recipes/Concepts/article-1.md`

```md
---
title: "状態管理 入門: チュートリアル"

description: "状態管理 に関する チュートリアル のダミー記事です。（自動生成 #177）"

category: "Houdini"

date: "2025-08-03"
---

# 状態管理 について

この記事では、状態管理 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Recipes/Patterns/article-0.md`

```md
---
title: "テスト 入門: 比較検証"

description: "テスト に関する 比較検証 のダミー記事です。（自動生成 #178）"

category: "Houdini"

date: "2025-03-22"
---

# テスト について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Recipes/Patterns/article-1.md`

```md
---
title: "トラブルシューティング - データ取得"

description: "データ取得 に関する トラブルシューティング のダミー記事です。（自動生成 #179）"

category: "Houdini"

date: "2025-08-03"
---

# データ取得 について

この記事では、データ取得 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Recipes/Setup/article-0.md`

```md
---
title: "ルーティング の セットアップ手順"

description: "ルーティング に関する セットアップ手順 のダミー記事です。（自動生成 #174）"

category: "Houdini"

date: "2025-10-31"
---

# ルーティング について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Recipes/Setup/article-1.md`

```md
---
title: "【スタイリング】ベストプラクティス (175)"

description: "スタイリング に関する ベストプラクティス のダミー記事です。（自動生成 #175）"

category: "Houdini"

date: "2025-06-10"
---

# スタイリング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Recipes/item-0.md`

```md
---
title: "データ取得 入門: よくある質問"

description: "データ取得 に関する よくある質問 のダミー記事です。（自動生成 #64）"

category: "Houdini"

date: "2026-02-06"
---

# データ取得 について

この記事では、データ取得 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/Recipes/item-1.md`

```md
---
title: "【テスト】パフォーマンス最適化"

description: "テスト に関する パフォーマンス最適化 のダミー記事です。（自動生成 #65）"

category: "Houdini"

date: "2026-02-06"
---

# テスト について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/first-post.md`

```md
---
title: "はじめての投稿"

description: "このテンプレートで最初に読むためのサンプル記事です。"

category: "Quick start"

date: "2026-03-15"
---

# Next.jsブログを作りました

GitHub Pagesで公開するために、Next.jsで開発ブログを作りました。

## 使用技術

- Next.js（App Router）
- GitHub Pages に静的書き出しでデプロイ
- Tailwind CSS で最低限スタイルを整備

## これから

学習ログを書いていきます。
```

---

## `posts/Houdini/post-houdini-0.md`

```md
---
title: "基礎 - データ取得"

description: "データ取得 に関する 基礎 のダミー記事です。（自動生成 #9）"

category: "Houdini"

date: "2025-06-14"
---

# データ取得 について

この記事では、データ取得 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/post-houdini-1.md`

```md
---
title: "デプロイ 入門: 応用"

description: "デプロイ に関する 応用 のダミー記事です。（自動生成 #10）"

category: "Houdini"

date: "2025-04-28"
---

# デプロイ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Houdini/post-houdini-2.md`

```md
---
title: "認証 の パフォーマンス最適化"

description: "認証 に関する パフォーマンス最適化 のダミー記事です。（自動生成 #11）"

category: "Houdini"

date: "2025-03-20"
---

# 認証 について

この記事では、認証 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/API/item-0.md`

```md
---
title: "デプロイ 入門: リファレンス"

description: "デプロイ に関する リファレンス のダミー記事です。（自動生成 #86）"

category: "JavaScript"

date: "2026-02-08"
---

# デプロイ について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/API/item-1.md`

```md
---
title: "セットアップ手順 - 認証"

description: "認証 に関する セットアップ手順 のダミー記事です。（自動生成 #87）"

category: "JavaScript"

date: "2025-04-02"
---

# 認証 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/Advanced/item-0.md`

```md
---
title: "状態管理 入門: 比較検証"

description: "状態管理 に関する 比較検証 のダミー記事です。（自動生成 #82）"

category: "JavaScript"

date: "2025-08-17"
---

# 状態管理 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/Advanced/item-1.md`

```md
---
title: "【データ取得】まとめ"

description: "データ取得 に関する まとめ のダミー記事です。（自動生成 #83）"

category: "JavaScript"

date: "2025-09-01"
---

# データ取得 について

この記事では、データ取得 について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/Basics/item-0.md`

```md
---
title: "リファレンス - ルーティング"

description: "ルーティング に関する リファレンス のダミー記事です。（自動生成 #80）"

category: "JavaScript"

date: "2025-05-02"
---

# ルーティング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/Basics/item-1.md`

```md
---
title: "スタイリング の まとめ"

description: "スタイリング に関する まとめ のダミー記事です。（自動生成 #81）"

category: "JavaScript"

date: "2025-08-16"
---

# スタイリング について

この記事では、スタイリング について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/Guides/item-0.md`

```md
---
title: "【認証】基礎"

description: "認証 に関する 基礎 のダミー記事です。（自動生成 #88）"

category: "JavaScript"

date: "2025-11-02"
---

# 認証 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/Guides/item-1.md`

```md
---
title: "【アクセシビリティ】チュートリアル"

description: "アクセシビリティ に関する チュートリアル のダミー記事です。（自動生成 #89）"

category: "JavaScript"

date: "2026-01-19"
---

# アクセシビリティ について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/Recipes/item-0.md`

```md
---
title: "テスト の メモ (84)"

description: "テスト に関する メモ のダミー記事です。（自動生成 #84）"

category: "JavaScript"

date: "2025-07-23"
---

# テスト について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/Recipes/item-1.md`

```md
---
title: "データ取得 の メモ"

description: "データ取得 に関する メモ のダミー記事です。（自動生成 #85）"

category: "JavaScript"

date: "2026-03-03"
---

# データ取得 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/post-javascript-0.md`

```md
---
title: "【データ取得】比較検証"

description: "データ取得 に関する 比較検証 のダミー記事です。（自動生成 #15）"

category: "JavaScript"

date: "2025-05-08"
---

# データ取得 について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/post-javascript-1.md`

```md
---
title: "型安全 の 比較検証"

description: "型安全 に関する 比較検証 のダミー記事です。（自動生成 #16）"

category: "JavaScript"

date: "2025-12-22"
---

# 型安全 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/JavaScript/post-javascript-2.md`

```md
---
title: "デプロイ の チュートリアル"

description: "デプロイ に関する チュートリアル のダミー記事です。（自動生成 #17）"

category: "JavaScript"

date: "2025-03-30"
---

# デプロイ について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Next/post-next-0.md`

```md
---
title: "ルーティング 入門: セットアップ手順"

description: "ルーティング に関する セットアップ手順 のダミー記事です。（自動生成 #27）"

category: "Next"

date: "2025-04-21"
---

# ルーティング について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Next/post-next-1.md`

```md
---
title: "チュートリアル - ルーティング (28)"

description: "ルーティング に関する チュートリアル のダミー記事です。（自動生成 #28）"

category: "Next"

date: "2025-12-25"
---

# ルーティング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Next/post-next-2.md`

```md
---
title: "コンポーネント 入門: 比較検証"

description: "コンポーネント に関する 比較検証 のダミー記事です。（自動生成 #29）"

category: "Next"

date: "2025-07-02"
---

# コンポーネント について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/React/post-react-0.md`

```md
---
title: "状態管理 の チュートリアル (21)"

description: "状態管理 に関する チュートリアル のダミー記事です。（自動生成 #21）"

category: "React"

date: "2025-11-09"
---

# 状態管理 について

まとめとして、以上の手順で再現できます。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/React/post-react-1.md`

```md
---
title: "チュートリアル - 型安全"

description: "型安全 に関する チュートリアル のダミー記事です。（自動生成 #22）"

category: "React"

date: "2025-05-21"
---

# 型安全 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/React/post-react-2.md`

```md
---
title: "認証 の メモ"

description: "認証 に関する メモ のダミー記事です。（自動生成 #23）"

category: "React"

date: "2025-06-28"
---

# 認証 について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/TypeScript/post-typescript-0.md`

```md
---
title: "【コンポーネント】メモ"

description: "コンポーネント に関する メモ のダミー記事です。（自動生成 #18）"

category: "TypeScript"

date: "2025-10-05"
---

# コンポーネント について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/TypeScript/post-typescript-1.md`

```md
---
title: "データ取得 の 応用"

description: "データ取得 に関する 応用 のダミー記事です。（自動生成 #19）"

category: "TypeScript"

date: "2025-05-29"
---

# データ取得 について

サンプルコードを以下に示します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/TypeScript/post-typescript-2.md`

```md
---
title: "セットアップ手順 - スタイリング"

description: "スタイリング に関する セットアップ手順 のダミー記事です。（自動生成 #20）"

category: "TypeScript"

date: "2025-08-25"
---

# スタイリング について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Vue/post-vue-0.md`

```md
---
title: "【ルーティング】基礎"

description: "ルーティング に関する 基礎 のダミー記事です。（自動生成 #24）"

category: "Vue"

date: "2025-12-27"
---

# ルーティング について

まずは環境構築から始めましょう。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Vue/post-vue-1.md`

```md
---
title: "【デプロイ】パフォーマンス最適化"

description: "デプロイ に関する パフォーマンス最適化 のダミー記事です。（自動生成 #25）"

category: "Vue"

date: "2025-08-30"
---

# デプロイ について

注意点として、本番環境では設定の見直しを推奨します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/Vue/post-vue-2.md`

```md
---
title: "アクセシビリティ 入門: よくある質問"

description: "アクセシビリティ に関する よくある質問 のダミー記事です。（自動生成 #26）"

category: "Vue"

date: "2025-06-05"
---

# アクセシビリティ について

この記事では、アクセシビリティ について解説します。

## 手順

1. まず設定を確認する
2. 必要に応じてオプションを変更する
3. ビルドして動作確認する

## 参考

公式ドキュメントを参照してください。
```

---

## `posts/github-md-list.md`

`````md
# 基本的な書き込みと書式設定の構文

単純な構文を使用して、GitHubで散文とコードの高度な書式設定を作成します。

<!-- TRANSLATION_FALLBACK prop=markdown type=ParseError line=300 col=53 msg="tag 'データ' not found" -->
## Headings

To create a heading, add one to six <kbd>#</kbd> symbols before your heading text. The number of <kbd>#</kbd> you use will determine the hierarchy level and typeface size of the heading.

```markdown
# A first-level heading
## A second-level heading
### A third-level heading
```

![Screenshot of rendered GitHub Markdown showing sample h1, h2, and h3 headers, which descend in type size and visual weight to show hierarchy level.](/assets/images/help/writing/headings-rendered.png)

When you use two or more headings, GitHub automatically generates a table of contents that you can access by clicking the "Outline" menu icon <svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-list-unordered" aria-label="Table of Contents" role="img"><path d="M5.75 2.5h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5Zm0 5h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5Zm0 5h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5ZM2 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-6a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM2 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg> within the file header. Each heading title is listed in the table of contents and you can click a title to navigate to the selected section.

![Screenshot of a README file with the drop-down menu for the table of contents exposed. The table of contents icon is outlined in dark orange.](/assets/images/help/repository/headings-toc.png)

## Styling text

You can indicate emphasis with bold, italic, strikethrough, subscript, or superscript text in comment fields and `.md` files.

| Style                  | Syntax              | Keyboard shortcut                                                                     | Example                                  | Output                                 |                                                   |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------- | ------------------------------------------------- |
| Bold                   | `** **` or `__ __`  | <kbd>Command</kbd>+<kbd>B</kbd> (Mac) or <kbd>Ctrl</kbd>+<kbd>B</kbd> (Windows/Linux) | `**This is bold text**`                  | **This is bold text**                  |                                                   |
| Italic                 | `* *` or `_ _`      | <kbd>Command</kbd>+<kbd>I</kbd> (Mac) or <kbd>Ctrl</kbd>+<kbd>I</kbd> (Windows/Linux) | `_This text is italicized_`              | *This text is italicized*              |                                                   |
| Strikethrough          | `~~ ~~` or `~ ~`    | None                                                                                  | `~~This was mistaken text~~`             | ~~This was mistaken text~~             |                                                   |
| Bold and nested italic | `** **` and `_ _`   | None                                                                                  | `**This text is _extremely_ important**` | **This text is *extremely* important** |                                                   |
| All bold and italic    | `*** ***`           | None                                                                                  | `***All this text is important***`       | ***All this text is important***       | <!-- markdownlint-disable-line emphasis-style --> |
| Subscript              | `<sub> </sub>`      | None                                                                                  | `This is a <sub>subscript</sub> text`    | This is a <sub>subscript</sub> text    |                                                   |
| Superscript            | `<sup> </sup>`      | None                                                                                  | `This is a <sup>superscript</sup> text`  | This is a <sup>superscript</sup> text  |                                                   |
| Underline              | `<ins> </ins>`      | None                                                                                  | `This is an <ins>underlined</ins> text`  | This is an <ins>underlined</ins> text  |                                                   |

## Quoting text

You can quote text with a <kbd>></kbd>.

```markdown
Text that is not a quote

> Text that is a quote
```

Quoted text is indented with a vertical line on the left and displayed using gray type.

![Screenshot of rendered GitHub Markdown showing the difference between normal and quoted text.](/assets/images/help/writing/quoted-text-rendered.png)

> \[!NOTE]
> When viewing a conversation, you can automatically quote text in a comment by highlighting the text, then typing <kbd>R</kbd>. You can quote an entire comment by clicking <svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-kebab-horizontal" aria-label="The horizontal kebab icon" role="img"><path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path></svg>, then **Quote reply**. For more information about keyboard shortcuts, see [Keyboard shortcuts](/en/get-started/accessibility/keyboard-shortcuts).

## Alerts (Callouts)

ブロック引用の先頭行に `> [!種類]` を書くと、GitHub ではアラート（注意書き）として表示されます。

> [!NOTE]
> Useful information that users should know, even when skimming content.

> [!TIP]
> Helpful advice for doing things better or more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.

**構文（共通）:**

```markdown
> [!NOTE]
> 本文テキスト

> [!TIP]
> 本文テキスト

> [!IMPORTANT]
> 本文テキスト

> [!WARNING]
> 本文テキスト

> [!CAUTION]
> 本文テキスト
```

## Quoting code

You can call out code or a command within a sentence with single backticks. The text within the backticks will not be formatted. You can also press the <kbd>Command</kbd>+<kbd>E</kbd> (Mac) or <kbd>Ctrl</kbd>+<kbd>E</kbd> (Windows/Linux) keyboard shortcut to insert the backticks for a code block within a line of Markdown.

```markdown
Use `git status` to list all new or modified files that haven't yet been committed.
```

![Screenshot of rendered GitHub Markdown showing that characters surrounded by backticks are shown in a fixed-width typeface, highlighted in light gray.](/assets/images/help/writing/inline-code-rendered.png)

To format code or text into its own distinct block, use triple backticks.

````markdown
Some basic Git commands are:
```
git status
git add
git commit
```
````

![Screenshot of rendered GitHub Markdown showing a simple code block without syntax highlighting.](/assets/images/help/writing/code-block-rendered.png)

For more information, see [Creating and highlighting code blocks](/en/get-started/writing-on-github/working-with-advanced-formatting/creating-and-highlighting-code-blocks).

If you are frequently editing code snippets and tables, you may benefit from enabling a fixed-width font in all comment fields on GitHub. For more information, see [About writing and formatting on GitHub](/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/about-writing-and-formatting-on-github#enabling-fixed-width-fonts-in-the-editor).

## Supported color models

In issues, pull requests, and discussions, you can call out colors within a sentence by using backticks. A supported color model within backticks will display a visualization of the color.

```markdown
The background color is `#ffffff` for light mode and `#000000` for dark mode.
```

![Screenshot of rendered GitHub Markdown showing how HEX values within backticks create small circles of color, here white and then black.](/assets/images/help/writing/supported-color-models-rendered.png)

Here are the currently supported color models.

| Color | Syntax                      | Example                             | Output                                                                                                                                                                         |
| ----- | --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HEX   | <code>\`#RRGGBB\`</code>    | <code>\`#0969DA\`</code>            | ![Screenshot of rendered GitHub Markdown showing how HEX value #0969DA appears with a blue circle.](/assets/images/help/writing/supported-color-models-hex-rendered.png)       |
| RGB   | <code>\`rgb(R,G,B)\`</code> | <code>\`rgb(9, 105, 218)\`</code>   | ![Screenshot of rendered GitHub Markdown showing how RGB value 9, 105, 218 appears with a blue circle.](/assets/images/help/writing/supported-color-models-rgb-rendered.png)   |
| HSL   | <code>\`hsl(H,S,L)\`</code> | <code>\`hsl(212, 92%, 45%)\`</code> | ![Screenshot of rendered GitHub Markdown showing how HSL value 212, 92%, 45% appears with a blue circle.](/assets/images/help/writing/supported-color-models-hsl-rendered.png) |

> \[!NOTE]
>
> * A supported color model cannot have any leading or trailing spaces within the backticks.
> * The visualization of the color is only supported in issues, pull requests, and discussions.

## Links

You can create an inline link by wrapping link text in brackets `[ ]`, and then wrapping the URL in parentheses `( )`. You can also use the keyboard shortcut <kbd>Command</kbd>+<kbd>K</kbd> to create a link. When you have text selected, you can paste a URL from your clipboard to automatically create a link from the selection.

You can also create a Markdown hyperlink by highlighting the text and using the keyboard shortcut <kbd>Command</kbd>+<kbd>V</kbd>. If you'd like to replace the text with the link, use the keyboard shortcut <kbd>Command</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>.

`This site was built using [GitHub Pages](https://pages.github.com/).`

![Screenshot of rendered GitHub Markdown showing how text within brackets, "GitHub Pages," appears as a blue hyperlink.](/assets/images/help/writing/link-rendered.png)

> \[!NOTE]
> GitHub automatically creates links when valid URLs are written in a comment. For more information, see [Autolinked references and URLs](/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls).

## Section links

You can link directly to any section that has a heading. To view the automatically generated anchor in a rendered file, hover over the section heading to expose the <svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-link" aria-label="the link" role="img"><path d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z"></path></svg> icon and click the icon to display the anchor in your browser.

![Screenshot of a README for a repository. To the left of a section heading, a link icon is outlined in dark orange.](/assets/images/help/repository/readme-links.png)

If you need to determine the anchor for a heading in a file you are editing, you can use the following basic rules:

* Letters are converted to lower-case.
* Spaces are replaced by hyphens (`-`). Any other whitespace or punctuation characters are removed.
* Leading and trailing whitespace are removed.
* Markup formatting is removed, leaving only the contents (for example, `_italics_` becomes `italics`).
* If the automatically generated anchor for a heading is identical to an earlier anchor in the same document, a unique identifier is generated by appending a hyphen and an auto-incrementing integer.

For more detailed information on the requirements of URI fragments, see [RFC 3986: Uniform Resource Identifier (URI): Generic Syntax, Section 3.5](https://www.rfc-editor.org/rfc/rfc3986#section-3.5).

The code block below demonstrates the basic rules used to generate anchors from headings in rendered content.

```markdown
# Example headings

## Sample Section

## This'll be a _Helpful_ Section About the Greek Letter Θ!
A heading containing characters not allowed in fragments, UTF-8 characters, two consecutive spaces between the first and second words, and formatting.

## This heading is not unique in the file

TEXT 1

## This heading is not unique in the file

TEXT 2

# Links to the example headings above

Link to the sample section: [Link Text](#sample-section).

Link to the helpful section: [Link Text](#thisll-be-a-helpful-section-about-the-greek-letter-Θ).

Link to the first non-unique section: [Link Text](#this-heading-is-not-unique-in-the-file).

Link to the second non-unique section: [Link Text](#this-heading-is-not-unique-in-the-file-1).
```

> \[!NOTE]
> If you edit a heading, or if you change the order of headings with "identical" anchors, you will also need to update any links to those headings as the anchors will change.

## Relative links

You can define relative links and image paths in your rendered files to help readers navigate to other files in your repository.

A relative link is a link that is relative to the current file. For example, if you have a README file in root of your repository, and you have another file in *docs/CONTRIBUTING.md*, the relative link to *CONTRIBUTING.md* in your README might look like this:

```text
[Contribution guidelines for this project](docs/CONTRIBUTING.md)
```

GitHub will automatically transform your relative link or image path based on whatever branch you're currently on, so that the link or path always works. The path of the link will be relative to the current file. Links starting with `/` will be relative to the repository root. You can use all relative link operands, such as `./` and `../`.

Your link text should be on a single line. The example below will not work.

```markdown
[Contribution
guidelines for this project](docs/CONTRIBUTING.md)
```

Relative links are easier for users who clone your repository. Absolute links may not work in clones of your repository - we recommend using relative links to refer to other files within your repository.

## Custom anchors

You can use standard HTML anchor tags (`<a name="unique-anchor-name"></a>`) to create navigation anchor points for any location in the document. To avoid ambiguous references, use a unique naming scheme for anchor tags, such as adding a prefix to the `name` attribute value.

> \[!NOTE]
> Custom anchors will not be included in the document outline/Table of Contents.

You can link to a custom anchor using the value of the `name` attribute you gave the anchor. The syntax is exactly the same as when you link to an anchor that is automatically generated for a heading.

For example:

```markdown
# Section Heading

Some body text of this section.

<a name="my-custom-anchor-point"></a>
Some text I want to provide a direct link to, but which doesn't have its own heading.

(… more content…)

[A link to that custom anchor](#my-custom-anchor-point)
```

> \[!TIP]
> Custom anchors are not considered by the automatic naming and numbering behavior of automatic heading links.

## Line breaks

If you're writing in issues, pull requests, or discussions in a repository, GitHub will render a line break automatically:

```markdown
This example
Will span two lines
```

However, if you are writing in an .md file, the example above would render on one line without a line break. To create a line break in an .md file, you will need to include one of the following:

* Include two spaces at the end of the first line.
  <pre>
  This example&nbsp;&nbsp;
  Will span two lines
  </pre>

* Include a backslash at the end of the first line.

  ```markdown
  This example\
  Will span two lines
  ```

* Include an HTML single line break tag at the end of the first line.

  ```markdown
  This example<br/>
  Will span two lines
  ```

If you leave a blank line between two lines, both .md files and Markdown in issues, pull requests, and discussions will render the two lines separated by the blank line:

```markdown
This example

Will have a blank line separating both lines
```

## Images

You can display an image by adding <kbd>!</kbd> and wrapping the alt text in `[ ]`. Alt text is a short text equivalent of the information in the image. Then, wrap the link for the image in parentheses `()`.

`![Screenshot of a comment on a GitHub issue showing an image, added in the Markdown, of an Octocat smiling and raising a tentacle.](https://myoctocat.com/assets/images/base-octocat.svg)`

![Screenshot of a comment on a GitHub issue showing an image, added in the Markdown, of an Octocat smiling and raising a tentacle.](/assets/images/help/writing/image-rendered.png)

GitHub supports embedding images into your issues, pull requests, discussions, comments and `.md` files. You can display an image from your repository, add a link to an online image, or upload an image. For more information, see [Uploading assets](#uploading-assets).

> \[!NOTE]
> When you want to display an image that is in your repository, use relative links instead of absolute links.

Here are some examples for using relative links to display an image.

| Context                                                     | Relative Link                                                          |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| In a `.md` file on the same branch                          | `/assets/images/electrocat.png`                                        |
| In a `.md` file on another branch                           | `/../main/assets/images/electrocat.png`                                |
| In issues, pull requests and comments of the repository     | `../blob/main/assets/images/electrocat.png?raw=true`                   |
| In a `.md` file in another repository                       | `/../../../../github/docs/blob/main/assets/images/electrocat.png`      |
| In issues, pull requests and comments of another repository | `../../../github/docs/blob/main/assets/images/electrocat.png?raw=true` |

> \[!NOTE]
> The last two relative links in the table above will work for images in a private repository only if the viewer has at least read access to the private repository that contains these images.

For more information, see [Relative Links](#relative-links).

### The Picture element

The `<picture>` HTML element is supported.

## Lists

You can make an unordered list by preceding one or more lines of text with <kbd>-</kbd>, <kbd>\*</kbd>, or <kbd>+</kbd>.

```markdown
- George Washington
* John Adams
+ Thomas Jefferson
```

![Screenshot of rendered GitHub Markdown showing a bulleted list of the names of the first three American presidents.](/assets/images/help/writing/unordered-list-rendered.png)

To order your list, precede each line with a number.

```markdown
1. James Madison
2. James Monroe
3. John Quincy Adams
```

![Screenshot of rendered GitHub Markdown showing a numbered list of the names of the fourth, fifth, and sixth American presidents.](/assets/images/help/writing/ordered-list-rendered.png)

### Nested Lists

You can create a nested list by indenting one or more list items below another item.

To create a nested list using the web editor on GitHub or a text editor that uses a monospaced font, like [Visual Studio Code](https://code.visualstudio.com/), you can align your list visually. Type space characters in front of your nested list item until the list marker character (<kbd>-</kbd> or <kbd>\*</kbd>) lies directly below the first character of the text in the item above it.

```markdown
1. First list item
   - First nested list item
     - Second nested list item
```

> \[!NOTE]
> In the web-based editor, you can indent or dedent one or more lines of text by first highlighting the desired lines and then using <kbd>Tab</kbd> or <kbd>Shift</kbd>+<kbd>Tab</kbd> respectively.

![Screenshot of Markdown in Visual Studio Code showing indentation of nested numbered lines and bullets.](/assets/images/help/writing/nested-list-alignment.png)

![Screenshot of rendered GitHub Markdown showing a numbered item followed by nested bullets at two different levels of nesting.](/assets/images/help/writing/nested-list-example-1.png)

To create a nested list in the comment editor on GitHub, which doesn't use a monospaced font, you can look at the list item immediately above the nested list and count the number of characters that appear before the content of the item. Then type that number of space characters in front of the nested list item.

In this example, you could add a nested list item under the list item `100. First list item` by indenting the nested list item a minimum of five spaces, since there are five characters (`100. `) before `First list item`.

```markdown
100. First list item
     - First nested list item
```

![Screenshot of rendered GitHub Markdown showing a numbered item prefaced by the number 100 followed by a bulleted item nested one level.](/assets/images/help/writing/nested-list-example-3.png)

You can create multiple levels of nested lists using the same method. For example, because the first nested list item has seven characters (`␣␣␣␣␣-␣`) before the nested list content `First nested list item`, you would need to indent the second nested list item by at least two more characters (nine spaces minimum).

```markdown
100. First list item
     - First nested list item
       - Second nested list item
```

![Screenshot of rendered GitHub Markdown showing a numbered item prefaced by the number 100 followed by bullets at two different levels of nesting.](/assets/images/help/writing/nested-list-example-2.png)

For more examples, see the [GitHub Flavored Markdown Spec](https://github.github.com/gfm/#example-265).

## Task lists

To create a task list, preface list items with a hyphen and space followed by `[ ]`. To mark a task as complete, use `[x]`.

```markdown
- [x] #739
- [ ] https://github.com/octo-org/octo-repo/issues/740
- [ ] Add delight to the experience when all tasks are complete :tada:
```

![Screenshot showing the rendered version of the markdown. The references to issues are rendered as issue titles.](/assets/images/help/writing/task-list-rendered-simple.png)

If a task list item description begins with a parenthesis, you'll need to escape it with <kbd>\\</kbd>:

`- [ ] \(Optional) Open a followup issue`

For more information, see [About tasklists](/en/get-started/writing-on-github/working-with-advanced-formatting/about-task-lists).

## Mentioning people and teams

You can mention a person or [team](/en/organizations/organizing-members-into-teams) on GitHub by typing <kbd>@</kbd> plus their username or team name. This will trigger a notification and bring their attention to the conversation. People will also receive a notification if you edit a comment to mention their username or team name. For more information about notifications, see [About notifications](/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/about-notifications).

> \[!NOTE]
> A person will only be notified about a mention if the person has read access to the repository and, if the repository is owned by an organization, the person is a member of the organization.

`@github/support What do you think about these updates?`

![Screenshot of rendered GitHub Markdown showing how the team mention "@github/support" renders as bold, clickable text.](/assets/images/help/writing/mention-rendered.png)

When you mention a parent team, members of its child teams also receive notifications, simplifying communication with multiple groups of people. For more information, see [About organization teams](/en/organizations/organizing-members-into-teams/about-teams).

Typing an <kbd>@</kbd> symbol will bring up a list of people or teams on a project. The list filters as you type, so once you find the name of the person or team you are looking for, you can use the arrow keys to select it and press either tab or enter to complete the name. For teams, enter the @organization/team-name and all members of that team will get subscribed to the conversation.

The autocomplete results are restricted to repository collaborators and any other participants on the thread.

## Referencing issues and pull requests

You can bring up a list of suggested issues and pull requests within the repository by typing <kbd>#</kbd>. Type the issue or pull request number or title to filter the list, and then press either tab or enter to complete the highlighted result.

For more information, see [Autolinked references and URLs](/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls).

## Referencing external resources

If custom autolink references are configured for a repository, then references to external resources, like a JIRA issue or Zendesk ticket, convert into shortened links. To know which autolinks are available in your repository, contact someone with admin permissions to the repository. For more information, see [Configuring autolinks to reference external resources](/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/configuring-autolinks-to-reference-external-resources).

## Uploading assets

You can upload assets like images by dragging and dropping, selecting from a file browser, or pasting. You can upload assets to issues, pull requests, comments, and `.md` files in your repository.

## Using emojis

You can add emoji to your writing by typing `:EMOJICODE:`, a colon followed by the name of the emoji.

`@octocat :+1: This PR looks great - it's ready to merge! :shipit:`

![Screenshot of rendered GitHub Markdown showing how emoji codes for +1 and shipit render visually as emoji.](/assets/images/help/writing/emoji-rendered.png)

Typing <kbd>:</kbd> will bring up a list of suggested emoji. The list will filter as you type, so once you find the emoji you're looking for, press **Tab** or **Enter** to complete the highlighted result.

For a full list of available emoji and codes, see [the Emoji-Cheat-Sheet](https://github.com/ikatyang/emoji-cheat-sheet/blob/github-actions-auto-update/README.md).

## Paragraphs

You can create a new paragraph by leaving a blank line between lines of text.

## Footnotes

You can add footnotes to your content by using this bracket syntax:

```text
Here is a simple footnote[^1].

A footnote can also have multiple lines[^2].

[^1]: My reference.
[^2]: To add line breaks within a footnote, add 2 spaces to the end of a line.  
This is a second line.
```

The footnote will render like this:

![Screenshot of rendered Markdown showing superscript numbers used to indicate footnotes, along with optional line breaks inside a note.](/assets/images/help/writing/footnote-rendered.png)

> \[!NOTE]
> The position of a footnote in your Markdown does not influence where the footnote will be rendered. You can write a footnote right after your reference to the footnote, and the footnote will still render at the bottom of the Markdown. Footnotes are not supported in wikis.

## Alerts

**Alerts**, also sometimes known as **callouts** or **admonitions**, are a Markdown extension based on the blockquote syntax that you can use to emphasize critical information. On GitHub, they are displayed with distinctive colors and icons to indicate the significance of the content.

Use alerts only when they are crucial for user success and limit them to one or two per article to prevent overloading the reader. Additionally, you should avoid placing alerts consecutively. Alerts cannot be nested within other elements.

To add an alert, use a special blockquote line specifying the alert type, followed by the alert information in a standard blockquote. Five types of alerts are available:

```markdown
> [!NOTE]
> Useful information that users should know, even when skimming content.

> [!TIP]
> Helpful advice for doing things better or more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.
```

Here are the rendered alerts:

![Screenshot of rendered Markdown alerts showing how Note, Tip, Important, Warning, and Caution render with different colored text and icons.](/assets/images/help/writing/alerts-rendered.png)

## Hiding content with comments

You can tell GitHub to hide content from the rendered Markdown by placing the content in an HTML comment.

```text
<!-- This content will not appear in the rendered Markdown -->
```

## Ignoring Markdown formatting

You can tell GitHub to ignore (or escape) Markdown formatting by using <kbd>\\</kbd> before the Markdown character.

`Let's rename \*our-new-project\* to \*our-old-project\*.`

![Screenshot of rendered GitHub Markdown showing how backslashes prevent the conversion of asterisks to italics.](/assets/images/help/writing/escaped-character-rendered.png)

For more information on backslashes, see Daring Fireball's [Markdown Syntax](https://daringfireball.net/projects/markdown/syntax#backslash).

> \[!NOTE]
> The Markdown formatting will not be ignored in the title of an issue or a pull request.

## Disabling Markdown rendering

When viewing a Markdown file, you can click **Code** at the top of the file to disable Markdown rendering and view the file's source instead.

![Screenshot of a Markdown file in a repository showing options for interacting with the file. A button, labeled "Code", is outlined in dark orange.](/assets/images/help/writing/display-markdown-as-source-global-nav-update.png)

Disabling Markdown rendering enables you to use source view features, such as line linking, which is not possible when viewing rendered Markdown files.

## Further reading

* [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
* [About writing and formatting on GitHub](/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/about-writing-and-formatting-on-github)
* [Working with advanced formatting](/en/get-started/writing-on-github/working-with-advanced-formatting)
* [Quickstart for writing on GitHub](/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github)
`````

---

## `posts/my-dev-env.md`

````md
---
title: "開発環境メモ"

description: "自分の開発環境を記録するためのサンプル記事です。"

category: "Environment"

date: "2026-03-14"
---

# 開発環境をまとめます

普段使っているツールです。

## 主な環境

- VS Code
- GitHub
- Node.js
- Next.js

## コードブロックの例

```ts
const hello = "world"
console.log(hello)
```

表も書けます。

| 技術         | 用途         |
| ------------ | ------------ |
| Next.js      | フロント     |
| GitHub Pages | ホスティング |

## 補足

`process.cwd()` を使って Markdown ファイルを読むと、静的エクスポートと dev の両方で扱いやすくなります。
````

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

---
