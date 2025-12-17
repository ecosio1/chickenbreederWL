import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure Next treats this folder as the workspace root (avoids picking up a different lockfile)
  outputFileTracingRoot: projectRoot,
  typedRoutes: false,
};

export default nextConfig;


