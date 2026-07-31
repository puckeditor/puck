import nextConfig from "eslint-config-next";
import turboConfig from "eslint-config-turbo/flat";
import prettierConfig from "eslint-config-prettier/flat";

// The following react-hooks/* rules were introduced by eslint-plugin-react-hooks
// v6 (pulled in via eslint-config-next@16). They didn't exist in the pre-migration
// config (eslint v7 / eslint-config-next v13), so disabling them preserves the
// prior linting behavior of the repo.
const newReactHooksRules = {
  "react-hooks/refs": "off",
  "react-hooks/error-boundaries": "off",
  "react-hooks/immutability": "off",
  "react-hooks/use-memo": "off",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/purity": "off",
  "react-hooks/preserve-manual-memoization": "off",
  "react-hooks/static-components": "off",
  "react-hooks/gating": "off",
  "react-hooks/incompatible-library": "off",
  "react-hooks/unsupported-syntax": "off",
  "react-hooks/component-hook-factories": "off",
  "react-hooks/globals": "off",
  "react-hooks/config": "off",
};

const config = [
  ...nextConfig,
  ...turboConfig,
  prettierConfig,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      // pre-migration (eslint-config-next@13) didn't flag forwardRef components
      // for missing displayName; preserving that behavior.
      "react/display-name": "off",
      ...newReactHooksRules,
    },
  },
];

export default config;
