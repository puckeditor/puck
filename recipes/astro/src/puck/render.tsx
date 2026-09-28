import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";

import { config } from "../puck.config";

// Rendered on the server, without shipping the editor to the browser
export default function PuckRender({ data }: { data: Data }) {
  return <Render config={config} data={data} />;
}
