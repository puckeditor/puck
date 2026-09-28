module.exports = {
  reactStrictMode: true,
  transpilePackages: ["@puckeditor/core", "lucide-react"],
  turbopack: {
    // We need this to properly resolve cloud-client and plugin-ai imports to local package
    resolveAlias: {
      "@puckeditor/core": "../../packages/core/index.ts",
    },
  },
};
