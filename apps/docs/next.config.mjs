import packageJson from "./package.json" assert { type: "json" };
import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
});

const BRANCH_NAME = process.env.VERCEL_GIT_COMMIT_REF || "";
const IS_RELEASE_BRANCH = BRANCH_NAME.startsWith("releases/");

export default withNextra({
  async redirects() {
    return [
      {
        source: "/docs/api-reference/configuration/fields/:path*",
        destination: "/docs/api-reference/fields/:path*",
        permanent: true,
      },
      {
        source: "/docs/api-reference/plugins",
        destination: "/docs/api-reference/plugin",
        permanent: true,
      },
      {
        source: "/docs/api-reference/overrides/component-list",
        destination: "/docs/api-reference/overrides/components",
        permanent: true,
      },
      {
        source: "/docs/api-reference/data",
        destination: "/docs/api-reference/data-model/data",
        permanent: true,
      },
      {
        source: "/docs/api-reference/app-state",
        destination: "/docs/api-reference/data-model/app-state",
        permanent: true,
      },
      {
        source: "/docs/extending-puck/custom-interfaces",
        destination: "/docs/extending-puck/composition",
        permanent: true,
      },
    ];
  },
  transpilePackages: ["@measured/puck"],
  basePath: IS_RELEASE_BRANCH
    ? `/v/${packageJson.version}`
    : process.env.NEXT_PUBLIC_IS_CANARY
    ? "/v/canary"
    : "",
});
