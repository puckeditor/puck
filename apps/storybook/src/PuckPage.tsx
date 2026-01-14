import { useState } from "react";
import type { Data } from "@puckeditor/core";
import { Puck } from "@puckeditor/core";
import { storybookToPuckConfig } from "@puckeditor/storybook-to-puck";
import * as appStories from "./App.stories";

const puckConfig = storybookToPuckConfig(appStories, {
  category: "Storybook",
});

const initialData: Partial<Data> = {
  root: { props: {} },
  content: [],
};

export default function PuckPage() {
  const [data, setData] = useState(initialData);

  return (
    <Puck
      config={puckConfig}
      data={data}
      onChange={setData}
      headerTitle="Storybook Puck"
      headerPath="/puck"
      height="100vh"
    />
  );
}
