import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/operator/changelog": ["./CHANGELOG.md"],
  },
};

export default nextConfig;
