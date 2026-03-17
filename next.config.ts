import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";
const repo = "Pastel"; // リポジトリ名（GitHub: Vserval/Pastel）

// npm run dev をプロジェクトフォルダで実行している前提で、ここをルートにする
const projectRoot = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  output: isProd ? "export" : undefined,
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