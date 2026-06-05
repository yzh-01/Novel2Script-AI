/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许从 docs/ 目录 import Markdown（schema-doc 页静态渲染用）
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    return config;
  },
};

module.exports = nextConfig;
