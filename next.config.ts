import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repo = "Pastel"; // リポジトリ名（GitHub: Vserval/Pastel）

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}/` : "",
};

export default nextConfig;