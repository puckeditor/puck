"use client";
import { useEffect, useState } from "react";
import { Config, Data, Drawer, Puck, Slot } from "@puckeditor/core";
import "@puckeditor/core/puck.css";

type Props = { Columns: { left: Slot; right: Slot }; Text: { text: string } };
const config: Config<Props> = {
  components: {
    Columns: {
      fields: {
        left: { type: "slot", allow: ["Text"] },
        right: { type: "slot", allow: ["Text"] },
      },
      render: ({ left: Left, right: Right }) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            padding: 32,
          }}
        >
          <Left style={{ minHeight: 300, border: "1px solid gray" }} />
          <Right style={{ minHeight: 300, border: "1px solid gray" }} />
        </div>
      ),
    },
    Text: {
      defaultProps: { text: "Inserted text" },
      render: ({ text }) => <p style={{ padding: 20 }}>{text}</p>,
    },
  },
};
export default function NestedDropRegression() {
  const [data, setData] = useState<Data<Props>>({
    root: {},
    content: [
      { type: "Columns", props: { id: "columns", left: [], right: [] } },
    ],
  });
  const [iframe, setIframe] = useState<boolean | null>(null);
  useEffect(() => {
    setIframe(!new URLSearchParams(window.location.search).has("noIframe"));
  }, []);
  if (iframe === null) return null;
  return (
    <Puck
      config={config}
      data={data}
      onChange={setData}
      iframe={{ enabled: iframe }}
      dnd={{ enableDragHandle: true }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          height: "90vh",
        }}
      >
        <Drawer>
          <Drawer.Item name="Text" />
          <Drawer.Item name="Columns" />
        </Drawer>
        <Puck.Preview />
      </div>
      <output data-testid="data">{JSON.stringify(data)}</output>
    </Puck>
  );
}
