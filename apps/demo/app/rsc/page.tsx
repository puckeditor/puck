import { Metadata } from "next";
import config from "../../config/server";
import { initialData } from "../../config/initial-data";
import { Components, RootProps } from "../../config/types";

import { Config } from "@/core";
import { Render, resolveAllData } from "@/core/bundle/rsc";

// NB This is only necessary for this demo app, as the `@/core/bundle/rsc` path does not resolve to dist but the type for Config does
// This will be resolved once the RSC package is merged with the regular package after DropZone support is dropped
const conf = config as unknown as Config;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: initialData["/"].root.title,
  };
}

export default async function Page() {
  const data = initialData["/"];
  const metadata = {
    example: "Hello, world",
  };

  const resolvedData = await resolveAllData<Components, RootProps>(
    data,
    conf,
    metadata
  );

  return <Render config={conf} data={resolvedData} metadata={metadata} />;
}
