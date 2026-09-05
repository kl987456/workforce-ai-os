import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
