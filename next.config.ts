import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/skrabble",
  trailingSlash: true,
  allowedDevOrigins: ["games.tyrode.dev"],
};

export default nextConfig;
