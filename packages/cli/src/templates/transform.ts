const WORKSPACE_PROTOCOL = /^workspace:/;

/** Recipe package.json → standalone app package.json */
export const transformPackageJson = (
  text: string,
  { appName, cliVersion }: { appName: string; cliVersion: string }
) => {
  const pkg = JSON.parse(text);
  pkg.name = appName;

  for (const field of ["dependencies", "devDependencies"] as const) {
    const deps = pkg[field] as Record<string, string> | undefined;
    if (!deps) continue;
    // Monorepo-only tooling
    delete deps["eslint-config-custom"];
    for (const [name, range] of Object.entries(deps)) {
      if (WORKSPACE_PROTOCOL.test(range)) deps[name] = `^${cliVersion}`;
    }
  }

  // The recipe's lint script depends on the monorepo eslint config
  if (pkg.scripts?.lint === "eslint") delete pkg.scripts.lint;

  return JSON.stringify(pkg, null, 2) + "\n";
};

/** Removes the monorepo `paths` that point @puckeditor/* at local sources */
export const transformTsconfig = (text: string) => {
  const config = JSON.parse(text);
  const paths = config.compilerOptions?.paths as
    | Record<string, string[]>
    | undefined;
  if (!paths || !Object.keys(paths).some((k) => k.startsWith("@puckeditor/")))
    return text;

  for (const key of Object.keys(paths)) {
    if (key.startsWith("@puckeditor/")) delete paths[key];
  }
  return JSON.stringify(config, null, 2) + "\n";
};

export const addDependencies = (
  text: string,
  packages: { name: string; range: string }[]
) => {
  const pkg = JSON.parse(text);
  pkg.dependencies = pkg.dependencies ?? {};
  for (const { name, range } of packages) pkg.dependencies[name] = range;
  pkg.dependencies = Object.fromEntries(
    Object.entries(pkg.dependencies as Record<string, string>).sort(
      ([a], [b]) => a.localeCompare(b)
    )
  );
  return JSON.stringify(pkg, null, 2) + "\n";
};
