// Browser e2e for the Vue demo. Verifies the Vue<->Puck bridge in a real
// browser (including the AutoFrame iframe path): editor renders Vue components,
// Pinia works via the `app` prop, scoped styles mirror into the iframe, and the
// <Render> page renders. Requires `vite preview` running on :4174.
import puppeteer from "puppeteer";

const BASE = process.env.BASE_URL || "http://localhost:4174";
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
  // Network 404s are tracked via the response listener (filtered by URL); the
  // generic console "Failed to load resource" message carries no URL, so ignore
  // it here to avoid double-counting.
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

  // Find the preview frame (or main doc) that contains the seeded heading.
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

  // Search for Card text (only present in the AutoFrame preview iframe, not the
  // main-doc sidebar) so we target the iframe, not the editor chrome.
  const headingFrame = await findText("Hello from a Vue component");
  check("editor: Vue components render in AutoFrame iframe", !!headingFrame);
  if (headingFrame) {
    const t = await headingFrame.evaluate(() => document.body.innerText);
    check("editor: Heading (plain props) renders", t.includes("Puck + Vue"));

    // contentEditable: the Heading title should render as an inline-editable
    // element in the editor (not [object Object]).
    const editable = await headingFrame.evaluate(() =>
      [...document.querySelectorAll("[contenteditable]")].some((e) =>
        (e.textContent || "").includes("Puck + Vue")
      )
    );
    check("editor: Heading title is inline-editable (contentEditable)", editable);
  }

  if (headingFrame) {
    const frameText = await headingFrame.evaluate(() => document.body.innerText);
    check("editor: Card (Vue local state) renders", frameText.includes("Hello from a Vue component"), frameText.slice(0, 200));
    check("editor: CounterBadge reads Pinia via app context (seed count 3)", /Pinia count:\s*3/.test(frameText), frameText.match(/Pinia count:[^\n]*/)?.[0]);
    check("editor: FancyBox (scoped styles + custom field) renders", frameText.includes("Scoped styles render in the iframe"));
    check("editor: Columns slot renders nested Vue component", frameText.includes("Inside a slot"));

    // Scoped-style mirroring: FancyBox border should be the purple accent, not
    // the default. Proves Vite's injected scoped CSS reached the iframe head.
    const borderColor = await headingFrame.evaluate(() => {
      const box = document.querySelector(".fancy-box");
      return box ? getComputedStyle(box).borderTopColor : null;
    });
    check("editor: scoped styles mirrored into iframe (FancyBox border applied)", borderColor === "rgb(124, 58, 237)", `borderTopColor=${borderColor}`);

    // Vue-local state survives: click the Card counter, then it should increment.
    const localState = await headingFrame.evaluate(async () => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Local state"));
      if (!btn) return "no-button";
      btn.click();
      await new Promise((r) => setTimeout(r, 50));
      return btn.textContent;
    });
    check("editor: Vue-local state interactive (counter increments)", /:\s*1/.test(localState || ""), localState);
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
  check("render: Heading renders", viewText.includes("Puck + Vue"));
  check("render: CounterBadge reads Pinia (count 3)", /Pinia count:\s*3/.test(viewText));
  check("render: Columns slot nested component renders", viewText.includes("Inside a slot"));
  check("render: no page/console errors", viewErrors.length === 0, viewErrors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
}

console.log("\ndemo-vue browser e2e\n");
console.log(results.join("\n"));
console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
