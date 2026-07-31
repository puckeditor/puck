import custom from "eslint-config-custom";

const config = [
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
