import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    '/*': [
      './src/data/knowledge_base/**/*',
      './src/data/eqanun_catalog.json',
      './src/data/eqanun_shards/**/*',
    ],
    '/chat': [
      './src/data/knowledge_base/**/*',
      './src/data/eqanun_catalog.json',
      './src/data/eqanun_shards/**/*',
    ],
    '/api/**/*': [
      './src/data/knowledge_base/**/*',
      './src/data/eqanun_catalog.json',
      './src/data/eqanun_shards/**/*',
    ],
  },
};

export default nextConfig;
