This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## One-liner: commit & push

PowerShell から **変更の確認 → ステージング → コミット → GitHub への push** までを一度に実行するコマンド例です。

```powershell
git status; git add .; git commit -m "update docs"; git push
```

コミットメッセージは毎回自分で書き換えてください。

## よく使う PowerShell コマンド

開発サーバー関連で自分用にメモしておくコマンドです。

```powershell
# 既存の node プロセスを強制終了
Get-Process node | Stop-Process -Force

# プロジェクトディレクトリへ移動
cd C:\Users\User\Documents\my-dev-blog

# TurboPack を無効にして Next.js を起動
npx next dev --no-turbo

# ポート 3000 で dev サーバーを起動
npm run dev -- -p 3000
```
