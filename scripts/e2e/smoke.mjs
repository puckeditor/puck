import { smoke } from "./smoke-framework.mjs";
import { dragAndDrop } from "./utils/drag-and-drop.mjs";

const runs = {
  oneLevel: async (page) => {
    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Heading"]',
      '[data-testid="dropzone:root:default-zone"]'
    );
  },
  twoLevels: async (page) => {
    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Grid"]',
      '[data-testid="dropzone:root:default-zone"]',
      "top"
    );

    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Heading"]',
      '[data-testid="dropzone:root:default-zone"] [data-puck-dropzone]'
    );
  },
  threeLevels: async (page) => {
    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Grid"]',
      '[data-testid="dropzone:root:default-zone"]',
      "top"
    );

    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Grid"]',
      '[data-testid="dropzone:root:default-zone"] [data-puck-dropzone]'
    );

    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Heading"]',
      '[data-testid="dropzone:root:default-zone"] [data-puck-dropzone] [data-puck-dropzone]'
    );
  },
  sixLevels: async (page) => {
    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Grid"]',
      '[data-testid="dropzone:root:default-zone"]',
      "top"
    );

    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Grid"]',
      '[data-testid="dropzone:root:default-zone"] [data-puck-dropzone]'
    );

    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Grid"]',
      '[data-testid="dropzone:root:default-zone"] [data-puck-dropzone] [data-puck-dropzone]'
    );

    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Grid"]',
      '[data-testid="dropzone:root:default-zone"] [data-puck-dropzone] [data-puck-dropzone] [data-puck-dropzone]'
    );

    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Grid"]',
      '[data-testid="dropzone:root:default-zone"] [data-puck-dropzone] [data-puck-dropzone] [data-puck-dropzone] [data-puck-dropzone]'
    );

    await dragAndDrop(
      page,
      '[data-testid="drawer-item:Heading"]',
      '[data-testid="dropzone:root:default-zone"] [data-puck-dropzone] [data-puck-dropzone] [data-puck-dropzone] [data-puck-dropzone] [data-puck-dropzone]'
    );
  },
};

const tests = [
  {
    label: "iframe, 2 levels",
    url: "http://localhost:3000/test/edit?disableIframe=false",
    run: runs.twoLevels,
  },
  {
    label: "iframe, 6 levels",
    url: "http://localhost:3000/test/edit?disableIframe=false",
    run: runs.sixLevels,
  },
  {
    label: "no iframe, 2 levels",
    url: "http://localhost:3000/test/edit?disableIframe=true",
    run: runs.twoLevels,
  },
  {
    label: "no iframe, 6 levels",
    url: "http://localhost:3000/test/edit?disableIframe=true",
    run: runs.sixLevels,
  },
];

(async () => {
  await smoke(tests, {
    chart: true,
    duration: 180,
    threshold: 300,
    puppeteerOptions: { headless: true },
  });
})();
