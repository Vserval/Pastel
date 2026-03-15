export type Post = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  content: string;
};

export const posts: Post[] = [
  {
    slug: "first-post",
    title: "Next.jsブログを作った",
    date: "2026-03-15",
    summary: "GitHub Pagesで公開するための最初のセットアップメモ。",
    content: `
Next.js でブログを作りました。

- App Router を使用
- GitHub Pages に静的書き出しでデプロイ
- Tailwind CSS で最低限スタイルを整備

これから学習ログを書いていきます。
    `.trim(),
  },
  {
    slug: "my-dev-env",
    title: "開発環境メモ",
    date: "2026-03-14",
    summary: "普段使っているエディタや拡張機能など。",
    content: `
普段の開発環境をまとめます。

- VS Code
- GitHub
- Node.js
- Next.js
    `.trim(),
  },
];

export function getPosts() {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug);
}
