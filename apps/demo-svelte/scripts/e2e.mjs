// Browser e2e for the Svelte demo. Verifies the Svelte<->Puck bridge in a real
// browser (including the AutoFrame iframe path): editor renders Svelte
// components, the runes store works via the `context` prop, scoped styles
// mirror into the iframe, and the <Render> page renders. Requires
// `vite preview` running on :4175.
import puppeteer from "puppeteer";

const BASE = process.env.BASE_URL || "http://localhost:4175";
const results = [];
let failed = 0;
const check = (name, cond, detail) => {
  if (cond) results.push(`  ✅ ${name}`);
  else {
    failed++;
    results.push(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  const errors = [];
  const ignore = (t) => /favicon\.ico|Failed to load resource/.test(t);
  page.on("pageerror", (e) => !ignore(String(e)) && errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !ignore(m.text())) errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !ignore(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`);
  });

  // --- Editor (/edit), components render inside the AutoFrame iframe ---
  await page.goto(`${BASE}/edit`, { waitUntil: "networkidle0" });

  const findText = async (needle) => {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      for (const frame of page.frames()) {
        try {
          const found = await frame.evaluate(
            (n) => document.body && document.body.innerText.includes(n),
            needle
          );
          if (found) return frame;
        } catch {
          /* frame navigated */
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  };

  const headingFrame = await findText("Hello from a Svelte component");
  check("editor: Svelte components render in AutoFrame iframe", !!headingFrame);
  if (headingFrame) {
    const t = await headingFrame.evaluate(() => document.body.innerText);
    check("editor: Heading (plain props) renders", t.includes("Puck + Svelte"));

    // contentEditable: the Heading title should render as an inline-editable
    // element in the editor (not [object Object]).
    const editable = await headingFrame.evaluate(() =>
      [...document.querySelectorAll("[contenteditable]")].some((e) =>
        (e.textContent || "").includes("Puck + Svelte")
      )
    );
    check("editor: Heading title is inline-editable (contentEditable)", editable);
  }

  if (headingFrame) {
    const frameText = await headingFrame.evaluate(() => document.body.innerText);
    check("editor: Card (Svelte local state) renders", frameText.includes("Hello from a Svelte component"), frameText.slice(0, 200));
    check("editor: CounterBadge reads store via context (seed count 3)", /Store count:\s*3/.test(frameText), frameText.match(/Store count:[^\n]*/)?.[0]);
    check("editor: FancyBox (scoped styles + custom field) renders", frameText.includes("Scoped styles render in the iframe"));
    check("editor: Columns slot renders nested Svelte component", frameText.includes("Inside a slot"));

    const borderColor = await headingFrame.evaluate(() => {
      const box = document.querySelector(".fancy-box");
      return box ? getComputedStyle(box).borderTopColor : null;
    });
    check("editor: scoped styles mirrored into iframe (FancyBox border applied)", borderColor === "rgb(124, 58, 237)", `borderTopColor=${borderColor}`);

    const localState = await headingFrame.evaluate(async () => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Local state"));
      if (!btn) return "no-button";
      btn.click();
      await new Promise((r) => setTimeout(r, 50));
      return btn.textContent;
    });
    check("editor: Svelte-local state interactive (counter increments)", /:\s*1/.test(localState || ""), localState);
  }

  check("editor: no page/console errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  // --- Render page (/), no iframe ---
  const viewErrors = [];
  const page2 = await browser.newPage();
  page2.on("pageerror", (e) => viewErrors.push(String(e)));
  page2.on("console", (m) => { if (m.type() === "error") viewErrors.push(m.text()); });
  await page2.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  const viewText = await page2.evaluate(() => document.body.innerText);
  check("render: Heading renders", viewText.includes("Puck + Svelte"));
  check("render: CounterBadge reads store (count 3)", /Store count:\s*3/.test(viewText));
  check("render: Columns slot nested component renders", viewText.includes("Inside a slot"));
  check("render: no page/console errors", viewErrors.length === 0, viewErrors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
}

console.log("\ndemo-svelte browser e2e\n");
console.log(results.join("\n"));
console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
