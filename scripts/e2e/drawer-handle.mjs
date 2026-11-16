import assert from "node:assert/strict";
import { setup } from "./utils/setup.mjs";

const { browser, page } = await setup(
  `${
    process.env.PUCK_TEST_URL || "http://localhost:3000"
  }/drawer-handle-regression`
);
try {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.waitForSelector('[data-testid="drawer-item:Text"] button');
  const button = await page.$('[data-testid="drawer-item:Text"] button');
  await button.click();
  assert.equal(
    await page.$eval('[data-testid="clicks"]', (el) => el.textContent),
    "1"
  );
  await page.focus('[data-testid="drawer-item:Text"] button');
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => document.querySelector('[data-testid="clicks"]').textContent === "2"
  );
  assert.equal(
    await page.$eval('[data-testid="clicks"]', (el) => el.textContent),
    "2"
  );
  const frame = page.frames().find((frame) => frame !== page.mainFrame());
  await frame.waitForSelector('[data-puck-dropzone="root:default-zone"]');
  const target = await (
    await frame.$('[data-puck-dropzone="root:default-zone"]')
  ).boundingBox();
  const drag = async (selector) => {
    const box = await (await page.$(selector)).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2, {
      steps: 2,
    });
    await page.mouse.move(target.x + target.width / 2, target.y + 30, {
      steps: 12,
    });
    await new Promise((resolve) => setTimeout(resolve, 400));
    await page.mouse.up();
    await new Promise((resolve) => setTimeout(resolve, 400));
  };
  await drag('[data-testid="drawer-item:Text"] button');
  const readData = () =>
    page.$eval('[data-testid="data"]', (el) => JSON.parse(el.textContent));
  assert.equal((await readData()).content.length, 1);
  await drag('[data-testid="drawer-item:Text"] button');
  assert.equal((await readData()).content.length, 2);
  await drag('[data-testid="drawer-item:Text"] input');
  assert.equal(
    (await readData()).content.length,
    2,
    "inputs remain non-draggable"
  );
  const disabledButton = await page.evaluateHandle(() =>
    [
      ...document.querySelectorAll('[data-testid="drawer-item:Text"] button'),
    ].find((el) => el.textContent === "Disabled drag")
  );
  const box = await disabledButton.asElement().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + 30, {
    steps: 12,
  });
  await page.mouse.up();
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(
    (await readData()).content.length,
    2,
    "disabled items cannot insert"
  );
  assert.deepEqual(errors, []);
  console.log(
    "Drawer handle: click, keyboard, repeated drag, disabled drag and input exclusion passed"
  );
} finally {
  await browser.close();
}
