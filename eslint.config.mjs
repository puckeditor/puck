import custom from "eslint-config-custom";

const config = [
  // eslint-config-next causes warning on Remix's default remix.config.js
  { ignores: ["recipes/remix/remix.config.js"] },
  ...custom,
  {
    settings: {
      next: {
        rootDir: ["apps/*/"],
      },
    },
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default config;
