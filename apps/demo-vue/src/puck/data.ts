const STORAGE_KEY = "puck-vue-demo";

export const seedData = {
  root: { props: { title: "My Vue page" } },
  content: [
    { type: "Heading", props: { id: "heading-1", title: "Puck + Vue" } },
    {
      type: "Card",
      props: {
        id: "card-1",
        title: "Hello from a Vue component",
        description: "Edit my fields — the local click counter won't reset.",
      },
    },
    { type: "CounterBadge", props: { id: "counter-1" } },
    {
      type: "FancyBox",
      props: { id: "fancy-1", text: "Scoped styles render in the iframe", color: "#7c3aed" },
    },
    {
      type: "Columns",
      props: {
        id: "cols-1",
        columns: 2,
        items: [
          { type: "Heading", props: { id: "h-in-slot", title: "Inside a slot" } },
        ],
      },
    },
  ],
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return seedData;
}

export function saveData(data: unknown) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
