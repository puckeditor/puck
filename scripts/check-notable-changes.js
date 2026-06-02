#!/usr/bin/env node
const { execSync } = require("child_process");

const sh = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

let lastTag;
try {
  lastTag = sh("git describe --tags --abbrev=0 --match 'v*'");
} catch {
  console.log("No prior version tag found — treating all history as notable.");
  process.exit(0);
}

const range = `${lastTag}..HEAD`;
const log = sh(`git log ${range} --pretty=%B%x00`);
const commits = log.split("\0").map((c) => c.trim()).filter(Boolean);

const notablePattern = /^(feat|fix)(\([^)]+\))?!?:\s/m;
const breakingPattern = /BREAKING CHANGE/;

const notable = commits.filter(
  (c) => notablePattern.test(c) || breakingPattern.test(c)
);

if (notable.length === 0) {
  console.log(
    `No notable changes since ${lastTag} (${commits.length} commits, none feat/fix/BREAKING).`
  );
  process.exit(1);
}

console.log(
  `Found ${notable.length} notable commit(s) since ${lastTag} (of ${commits.length} total).`
);
process.exit(0);
