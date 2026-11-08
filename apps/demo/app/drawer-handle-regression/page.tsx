"use client";
import { useState } from "react";
import { Config, Data, Drawer, Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";

const config: Config = {
  components: {
    Text: { render: () => <p>Inserted text</p> },
  },
};

export default function DrawerHandleRegression() {
  const [data, setData] = useState<Data>({ content: [], root: {} });
  const [clicks, setClicks] = useState(0);
  return (
    <Puck config={config} data={data} onChange={setData}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "250px 1fr",
          height: "90vh",
        }}
      >
        <Drawer>
          <Drawer.Item name="Text">
            {({ handleRef }) => (
              <button
                ref={handleRef}
                onClick={() => setClicks((n) => n + 1)}
                style={{ width: "100%", height: 60 }}
              >
                Text
              </button>
            )}
          </Drawer.Item>
          <Drawer.Item name="Text" id="disabled-text" isDragDisabled>
            {({ handleRef }) => <button ref={handleRef}>Disabled drag</button>}
          </Drawer.Item>
          <Drawer.Item name="Text" id="input-text">
            {() => <input aria-label="Editable field" defaultValue="Text" />}
          </Drawer.Item>
        </Drawer>
        <Puck.Preview />
      </div>
      <output data-testid="data">{JSON.stringify(data)}</output>
      <output data-testid="clicks">{clicks}</output>
    </Puck>
  );
}
