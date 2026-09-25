import custom from "eslint-config-custom";

const config = [...custom, { ignores: ["dist/**"] }];

export default config;
