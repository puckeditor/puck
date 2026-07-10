// Test logic for the @puckeditor/svelte bridge smoke suite. Bundled (with the
// source layer + fixtures compiled by svelte/compiler, core aliased to preact)
// and run in jsdom by index.mjs. Mirrors the vue smoke: validates the
// Svelte<->Preact bridge (mount, patch-in-place, state persistence, slots,
// custom fields, editor ready) headlessly. Full drag/overlay is verified in
// apps/demo-svelte.
import { mount } from "svelte";
import { Render, Puck } from "../../svelte/index.js";
import Heading from "./fixtures/Heading.svelte";
import Card from "./fixtures/Card.svelte";
import Text from "./fixtures/Text.svelte";
import Columns from "./fixtures/Columns.svelte";
import TextControl from "./fixtures/TextControl.svelte";
import RenderProbe from "./fixtures/RenderProbe.svelte";
import EditableHeading from "./fixtures/EditableHeading.svelte";

const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

const mountTop = (Comp, props) => {
  const el = document.createElement("div");
  el.style.height = "600px";
  document.body.appendChild(el);
  mount(Comp, { target: el, props });
  return el;
};

export async function run() {
  let passed = 0;
  let failed = 0;
  const results = [];
  const check = (name, cond, detail) => {
    if (cond) {
      passed++;
      results.push(`  ✅ ${name}`);
    } else {
      failed++;
      results.push(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    }
  };

  // --- Render: plain props ---
  {
    const config = {
      components: {
        Heading: { fields: { title: { type: "text" } }, render: Heading },
      },
    };
    const data = {
      root: {},
      content: [{ type: "Heading", props: { id: "h1", title: "Hi from Svelte" } }],
    };
    const el = mountTop(Render, { config, data });
    await tick(100);
    const html = el.innerHTML;
    check(
      "Render: Svelte component renders",
      html.includes("Hi from Svelte") && html.includes("svelte-heading"),
      html.slice(0, 200)
    );
    check(
      "Render: no [object Object] leaks",
      !html.includes("[object Object]"),
      html.slice(0, 200)
    );
  }

  // --- Render: slot via <PuckSlot> ---
  {
    const config = {
      components: {
        Columns: { fields: { items: { type: "slot" } }, render: Columns },
        Text: { fields: { text: { type: "text" } }, render: Text },
      },
    };
    const data = {
      root: {},
      content: [
        {
          type: "Columns",
          props: {
            id: "col1",
            items: [{ type: "Text", props: { id: "t1", text: "Inside slot" } }],
          },
        },
      ],
    };
    const el = mountTop(Render, { config, data });
    await tick(150);
    const html = el.innerHTML;
    check("Slot: outer Svelte component renders", html.includes("columns"), html.slice(0, 200));
    check(
      "Slot: nested Svelte component renders via <PuckSlot> portal",
      html.includes("Inside slot") && html.includes('class="text"'),
      html.slice(0, 300)
    );
    check("Slot: no [object Object] leaks", !html.includes("[object Object]"));
  }

  // --- Render: patch-in-place + Svelte-local state persistence ---
  {
    const config = {
      components: {
        Card: { fields: { label: { type: "text" } }, render: Card },
      },
    };
    const initialData = {
      root: {},
      content: [{ type: "Card", props: { id: "c1", label: "First" } }],
    };
    let api = null;
    const el = mountTop(RenderProbe, {
      config,
      initialData,
      register: (a) => {
        api = a;
      },
    });
    await tick(120);
    const before = (el.textContent.match(/state=(local#\d+)/) || [])[1];
    check(
      "Patch: initial render",
      el.textContent.includes("label=First"),
      el.textContent
    );
    check(
      "Patch: getPuck().isEditing false in <Render>",
      el.textContent.includes("editing=false"),
      el.textContent
    );

    api.setData({
      root: {},
      content: [{ type: "Card", props: { id: "c1", label: "Edited" } }],
    });
    await tick(120);
    const after = (el.textContent.match(/state=(local#\d+)/) || [])[1];
    check(
      "Patch: prop updates in place",
      el.textContent.includes("label=Edited"),
      el.textContent
    );
    check(
      "Patch: Svelte-local state survives (patch, not remount)",
      !!before && before === after,
      `before=${before} after=${after}`
    );
  }

  // --- Puck editor: ready + custom field + patch-in-place ---
  {
    const config = {
      components: {
        Card: {
          fields: {
            label: { type: "custom", label: "Label", render: TextControl },
          },
          defaultProps: { label: "First" },
          render: Card,
        },
      },
    };
    const data = {
      root: {},
      content: [{ type: "Card", props: { id: "c1", label: "First" } }],
    };

    let readyApi = null;
    let threw = null;
    let el;
    try {
      el = mountTop(Puck, {
        config,
        data,
        iframe: { enabled: false },
        onready: (getPuck) => {
          readyApi = getPuck;
        },
      });
    } catch (e) {
      threw = e;
    }
    await tick(300);
    check("Puck: editor mounts without throwing", !threw, threw && threw.message);
    check("Puck: onready fires", !!readyApi);

    let apiOk = false;
    if (readyApi) {
      try {
        const api = readyApi();
        apiOk = !!(api && api.appState && api.dispatch);
      } catch (e) {
        /* ignore */
      }
    }
    check("Puck: getPuck() returns working PuckApi", apiOk);

    // Select the Card so the fields panel renders its custom Svelte field.
    if (readyApi) {
      readyApi().dispatch({ type: "setUi", ui: { itemSelector: { index: 0 } } });
    }
    await tick(300);
    const html = el ? el.innerHTML : "";
    check(
      "Custom field: Svelte field renders in editor fields panel",
      html.includes("custom-field-input"),
      `len=${html.length}`
    );
    check(
      "Patch: previewed Card renders initial label + editing=true",
      (el?.textContent || "").includes("label=First") &&
        (el?.textContent || "").includes("editing=true"),
      el?.textContent?.match(/label=[^\n]*/)?.[0]
    );

    // onChange round-trip: type into the Svelte field → data updates.
    const input = el && el.querySelector(".custom-field-input");
    if (input) {
      input.value = "Edited via Svelte field";
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
      await tick(250);
    }
    const title = readyApi ? readyApi().appState.data.content[0].props.label : null;
    check(
      "Custom field: onChange flows back to Puck data",
      title === "Edited via Svelte field",
      `label=${title}`
    );
    check(
      "Editor patch: label updates in place in the preview",
      (el?.textContent || "").includes("label=Edited via Svelte field"),
      el?.textContent?.match(/label=[^\n]*/)?.[0]
    );
  }

  // --- Puck editor: slot renders inside the editable DropZone ---
  {
    const config = {
      components: {
        Columns: { fields: { items: { type: "slot" } }, render: Columns },
        Text: { fields: { text: { type: "text" } }, render: Text },
      },
    };
    const data = {
      root: {},
      content: [
        {
          type: "Columns",
          props: {
            id: "col1",
            items: [
              { type: "Text", props: { id: "t1", text: "Slot in editor" } },
            ],
          },
        },
      ],
    };
    let threw = null;
    let el;
    try {
      el = mountTop(Puck, { config, data, iframe: { enabled: false } });
    } catch (e) {
      threw = e;
    }
    await tick(400);
    check("Puck slot: editor with slot mounts", !threw, threw && threw.message);
    const html = el ? el.innerHTML : "";
    check(
      "Puck slot: nested Svelte slot content renders in editor (DropZone portal)",
      html.includes("Slot in editor"),
      `len=${html.length}`
    );
  }

  // --- contentEditable text field (via <PuckText>) ---
  {
    const config = {
      components: {
        EH: {
          fields: { title: { type: "text", contentEditable: true } },
          render: EditableHeading,
        },
      },
    };
    const data = {
      root: {},
      content: [{ type: "EH", props: { id: "eh1", title: "Editable Hi" } }],
    };

    // <Render>: value is a plain string, portaled as text.
    const rel = mountTop(Render, { config, data });
    await tick(150);
    check(
      "contentEditable: renders as text in <Render>",
      rel.textContent.includes("Editable Hi") &&
        rel.innerHTML.includes('class="eh"'),
      rel.innerHTML.slice(0, 200)
    );
    check(
      "contentEditable: no [object Object] leak in <Render>",
      !rel.innerHTML.includes("[object Object]")
    );

    // Editor: value is an <InlineTextField> element, portaled as editable.
    let eel;
    let threw = null;
    try {
      eel = mountTop(Puck, { config, data, iframe: { enabled: false } });
    } catch (e) {
      threw = e;
    }
    await tick(350);
    const ehHtml = eel ? eel.innerHTML : "";
    check(
      "contentEditable: editor mounts without throwing",
      !threw,
      threw && threw.message
    );
    check(
      "contentEditable: inline-editable element renders in editor",
      ehHtml.includes("Editable Hi") && /contenteditable/i.test(ehHtml),
      `len=${ehHtml.length}`
    );
    check(
      "contentEditable: no [object Object] leak in editor",
      !ehHtml.includes("[object Object]")
    );
  }

  return { passed, failed, results };
}
