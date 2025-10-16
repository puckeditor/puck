const turboConfig = require("eslint-config-turbo").default.extends;

module.exports = {
  extends: ["next", ...turboConfig, "prettier"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
  },
  parserOptions: {
    babelOptions: {
      presets: [],
    },
  },
};
