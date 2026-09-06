import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出：构建后生成 out/ 目录（纯静态文件，可直接部署到任意静态服务器）
  output: "export",
  // 静态导出不支持 Next.js 图片优化，需关闭
  images: {
    unoptimized: true,
  },
  // 生成 /games/snake/ 形式目录（含 index.html），静态托管更友好
  trailingSlash: true,
};

export default nextConfig;
