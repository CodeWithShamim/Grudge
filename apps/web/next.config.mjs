import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // genlayer-js and wallet libs ship ESM that expects browser globals; keep
  // them out of the server bundle except where explicitly imported.
  transpilePackages: ["genlayer-js"],
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // @metamask/sdk optionally requires react-native storage; not needed on web.
    config.resolve.alias["@react-native-async-storage/async-storage"] = false;
    return config;
  },
};

export default nextConfig;
