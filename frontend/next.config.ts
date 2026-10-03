import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    '/*': ['./src/data/knowledge_base/**/*'],
    '/chat': ['./src/data/knowledge_base/**/*'],
    '/api/**/*': ['./src/data/knowledge_base/**/*'],
  },
};

export default nextConfig;
