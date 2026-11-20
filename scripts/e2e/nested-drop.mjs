import assert from "node:assert/strict";
import { setup } from "./utils/setup.mjs";

const base = process.env.PUCK_TEST_URL || "http://localhost:3000";
const { browser, page } = await setup(`${base}/nested-drop-regression`);
const results = [];
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  for (const iframe of [true, false]) {
    for (let attempt = 0; attempt < 8; attempt++) {
      await page.goto(
        `${base}/nested-drop-regression${iframe ? "" : "?noIframe"}`
      );
      await page.waitForSelector('[data-testid="drawer-item:Text"]');
      const canvas = iframe
        ? page.frames().find((frame) => frame !== page.mainFrame())
        : page;
      await canvas.waitForSelector('[data-puck-dropzone="columns:left"]');
      const source = await (
        await page.$('[data-testid="drawer-item:Text"]')
      ).boundingBox();
      const left = await (
        await canvas.$('[data-puck-dropzone="columns:left"]')
      ).boundingBox();
      const right = await (
        await canvas.$('[data-puck-dropzone="columns:right"]')
      ).boundingBox();
      const [target, waypoint] = attempt % 2 ? [left, right] : [right, left];
      await page.mouse.move(
        source.x + source.width / 2,
        source.y + source.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        source.x + source.width / 2 + 12,
        source.y + source.height / 2,
        { steps: 2 }
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      await page.mouse.move(waypoint.x + waypoint.width / 2, waypoint.y + 60, {
        steps: 8,
      });
      await page.mouse.move(target.x + target.width / 2, target.y + 60, {
        steps: 2,
      });
      await page.mouse.up();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = await page.$eval('[data-testid="data"]', (el) =>
        JSON.parse(el.textContent)
      );
      const columns = data.content.find(
        (item) => item.type === "Columns"
      ).props;
      const expected = attempt % 2 ? "left" : "right";
      const actual = columns.right.length
        ? "right"
        : columns.left.length
        ? "left"
        : "root";
      results.push({ iframe, attempt, expected, actual, data });
    }
  }
  await page.goto(`${base}/nested-drop-regression`);
  await page.waitForSelector('[data-testid="drawer-item:Text"]');
  const canvas = page.frames().find((frame) => frame !== page.mainFrame());
  await canvas.waitForSelector('[data-puck-dropzone="columns:right"]');
  const target = await (
    await canvas.$('[data-puck-dropzone="columns:right"]')
  ).boundingBox();
  const source = await (
    await page.$('[data-testid="drawer-item:Text"]')
  ).boundingBox();
  const start = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y, { steps: 2 });
  await page.mouse.move(target.x + target.width / 2, target.y + 60, {
    steps: 8,
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.up();
  await new Promise((resolve) => setTimeout(resolve, 500));
  const readData = () =>
    page.$eval('[data-testid="data"]', (el) => JSON.parse(el.textContent));
  assert.deepEqual(
    (await readData()).content[0].props.right,
    [],
    "drawer release cancels a pending preview"
  );
  assert.equal(
    (await readData()).content.length,
    1,
    "drawer release must not insert at root"
  );
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + 60);
  await page.mouse.up();
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.equal(
    (await readData()).content[0].props.right.length,
    1,
    "retry with immediate iframe entry commits without waiting for a preview"
  );
  console.log(JSON.stringify({ results, errors }, null, 2));
  assert.deepEqual(errors, []);
  assert.ok(
    results.every(({ expected, actual }) => expected === actual),
    "every release must commit to its final slot"
  );
} finally {
  await browser.close();
}
