import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./src/data/knowledge_base/**/*'],
    '/chat': ['./src/data/knowledge_base/**/*'],
    '/api/**/*': ['./src/data/knowledge_base/**/*'],
  },
};

export default nextConfig;
