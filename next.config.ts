import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/interstice",
  trailingSlash: true,
  allowedDevOrigins: ["games.tyrode.dev"],
  devIndicators: false,
};

export default nextConfig;
