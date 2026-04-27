import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@voicefit/contracts"],
  // The `@ifct2017/compositions` package reads its CSV at runtime via
  // fs.readFileSync (compositions.csv() returns a path inside node_modules),
  // so Next.js's JS-only tracer drops it from the serverless bundle and
  // Vercel runs the function without the data file. Force-include it for
  // every interpret route so the agent's IFCT tool keeps working in prod.
  outputFileTracingIncludes: {
    "/api/interpret/**/*": ["./node_modules/@ifct2017/compositions/*.csv"],
  },
};

export default nextConfig;
