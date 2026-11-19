import packageJson from "./package.json" with { type: "json" };
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
        destination: "/docs/editor/api-reference/fields/:path*",
        permanent: true,
      },
      {
        source: "/docs/api-reference/plugins",
        destination: "/docs/editor/api-reference/plugin",
        permanent: true,
      },
      {
        source: "/docs/api-reference/overrides/component-list",
        destination: "/docs/editor/api-reference/overrides/drawer",
        permanent: true,
      },
      {
        source: "/docs/api-reference/data",
        destination: "/docs/editor/api-reference/data-model/data",
        permanent: true,
      },
      {
        source: "/docs/api-reference/app-state",
        destination: "/docs/editor/api-reference/data-model/app-state",
        permanent: true,
      },
      {
        source: "/docs/extending-puck/custom-interfaces",
        destination: "/docs/editor/customize/composition",
        permanent: true,
      },
      // Pages moved under Puck Editor
      ...[
        ["editor", "editor/overview"],
        ["getting-started", "editor/getting-started"],
        [
          "integrating-puck/component-configuration",
          "editor/components-and-fields/component-configuration",
        ],
        [
          "integrating-puck/root-configuration",
          "editor/components-and-fields/root-configuration",
        ],
        [
          "integrating-puck/multi-column-layouts",
          "editor/components-and-fields/multi-column-layouts",
        ],
        [
          "integrating-puck/rich-text-editing",
          "editor/components-and-fields/rich-text-editing",
        ],
        [
          "integrating-puck/dynamic-fields",
          "editor/components-and-fields/dynamic-fields",
        ],
        [
          "integrating-puck/field-grouping",
          "editor/components-and-fields/field-grouping",
        ],
        [
          "extending-puck/custom-fields",
          "editor/components-and-fields/custom-fields",
        ],
        [
          "extending-puck/field-transforms",
          "editor/components-and-fields/field-transforms",
        ],
        [
          "integrating-puck/overlay-portals",
          "editor/components-and-fields/overlay-portals",
        ],
        [
          "integrating-puck/dynamic-props",
          "editor/data-and-rendering/dynamic-props",
        ],
        [
          "integrating-puck/external-data-sources",
          "editor/data-and-rendering/external-data-sources",
        ],
        [
          "integrating-puck/server-components",
          "editor/data-and-rendering/server-components",
        ],
        ["integrating-puck/categories", "editor/customize/categories"],
        ["integrating-puck/styling", "editor/customize/styling"],
        ["extending-puck/theming", "editor/customize/theming"],
        ["integrating-puck/viewports", "editor/customize/viewports"],
        ["integrating-puck/localization", "editor/customize/localization"],
        [
          "integrating-puck/feature-toggling",
          "editor/customize/feature-toggling",
        ],
        ["extending-puck/ui-overrides", "editor/customize/ui-overrides"],
        ["extending-puck/composition", "editor/customize/composition"],
        ["extending-puck/plugins", "editor/customize/plugins"],
        [
          "extending-puck/internal-puck-api",
          "editor/customize/internal-puck-api",
        ],
        ["integrating-puck/data-migration", "editor/migrations/data-migration"],
        [
          "api-reference/overrides/components",
          "editor/api-reference/overrides/drawer",
        ],
        [
          "api-reference/overrides/component-item",
          "editor/api-reference/overrides/drawer-item",
        ],
        ["api-reference/theming", "editor/api-reference/theming/global"],
        ["extending-puck/theming/:path*", "editor/customize/theming"],
        ["integrating-puck/:path*", "editor/overview"],
        ["extending-puck/:path*", "editor/overview"],
        ["guides/migrations/:path*", "editor/migrations/:path*"],
        ["api-reference/:path*", "editor/api-reference/:path*"],
      ].map(([source, destination]) => ({
        source: `/docs/${source}`,
        destination: `/docs/${destination}`,
        permanent: true,
      })),
      // There's no docs index page while the structure is experimental.
      {
        source: "/docs",
        destination: "/docs/editor/overview",
        permanent: false,
      },
    ];
  },
  transpilePackages: ["@puckeditor/core"],
  basePath: IS_RELEASE_BRANCH
    ? `/v/${packageJson.version}`
    : process.env.NEXT_PUBLIC_IS_CANARY
    ? "/v/canary"
    : "",
});
