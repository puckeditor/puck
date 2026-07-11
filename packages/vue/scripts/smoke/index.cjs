// Headless smoke tests for the @puckeditor/vue bridge, exercising the BUILT
// bundle (dist/index.js) in jsdom. Run after building: `node scripts/smoke`.
//
// These validate the Vue<->Preact bridge mechanics (mount, patch-in-place,
// state persistence, slots, custom fields, editor `ready`) without a browser.
// Full drag/overlay behaviour is verified in apps/demo-vue.
const { setupDom, tick } = require("tsup-config/smoke-env.cjs");
const dom = setupDom();
const w = dom.window;

const Vue = require("vue");
const { defineComponent, h, reactive, createApp, nextTick } = Vue;
const puck = require("../../dist/index.js");
const { Render, Puck, usePuck, usePuckApi, FieldLabel, transformConfig } = puck;

let passed = 0;
let failed = 0;
const results = [];
function check(name, cond, detail) {
  if (cond) {
    passed++;
    results.push(`  ✅ ${name}`);
  } else {
    failed++;
    results.push(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function mountApp(vnodeFactory) {
  const el = w.document.createElement("div");
  el.style.height = "600px";
  w.document.body.appendChild(el);
  const app = createApp({ render: vnodeFactory });
  app.mount(el);
  return { el, app };
}

async function testRenderPlainProps() {
  const Heading = defineComponent({
    name: "Heading",
    props: { title: { type: String, default: "" } },
    render() { return h("h1", { class: "vue-heading" }, this.title); },
  });
  const config = {
    components: {
      Heading: { fields: { title: { type: "text" } }, render: Heading },
    },
  };
  const data = { root: {}, content: [{ type: "Heading", props: { id: "h1", title: "Hi from Vue" } }] };
  const { el } = mountApp(() => h(Render, { config, data }));
  await tick(100);
  const html = el.innerHTML;
  check("Render: Vue component renders", html.includes("Hi from Vue") && html.includes("vue-heading"), html);
  check("Render: no fallthrough [object Object] attrs", !html.includes("[object Object]"), html);
}

async function testPatchAndStatePersistence() {
  let mountCount = 0;
  const Card = defineComponent({
    name: "Card",
    props: { label: { type: String, default: "" } },
    setup() {
      mountCount++;
      const localState = `local#${mountCount}`;
      // usePuck() returns the reactive context object; property reads off it
      // (in templates or render fns) stay reactive.
      const puck = usePuck();
      return { localState, puck };
    },
    render() {
      return h("div", { class: "card" }, `label=${this.label} state=${this.localState} editing=${this.puck.isEditing}`);
    },
  });
  const config = { components: { Card: { fields: { label: { type: "text" } }, render: Card } } };
  const data = reactive({ root: {}, content: [{ type: "Card", props: { id: "c1", label: "First" } }] });
  const { el } = mountApp(() => h(Render, { config, data }));
  await tick(100);
  check("Patch: initial render", el.textContent.includes("label=First"), el.textContent);
  check("Patch: usePuck().isEditing false in <Render>", el.textContent.includes("editing=false"));

  data.content[0].props.label = "Edited";
  await nextTick();
  await tick(100);
  check("Patch: prop updates in place", el.textContent.includes("label=Edited"), el.textContent);
  check("Patch: Vue-local state survives (no remount)", el.textContent.includes("state=local#1") && mountCount === 1, `mountCount=${mountCount}`);
}

async function testSlotOutlet() {
  const Text = defineComponent({
    name: "Text",
    props: { text: { type: String, default: "" } },
    render() { return h("p", { class: "text" }, this.text); },
  });
  const Columns = defineComponent({
    name: "Columns",
    props: { items: { type: [Object, Function], default: undefined } },
    render() {
      return h("div", { class: "columns" }, [this.items ? h(this.items) : null]);
    },
  });
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
  const { el } = mountApp(() => h(Render, { config, data }));
  await tick(150);
  const html = el.innerHTML;
  check("Slot: outer Vue component renders", html.includes("columns"), html);
  check("Slot: nested Vue component renders via <component :is> portal", html.includes("Inside slot") && html.includes('class="text"'), html);
  check("Slot: no [object Object] leaks", !html.includes("[object Object]"), html);
}

async function testRootChildren() {
  const Text = defineComponent({
    name: "Text",
    props: { text: { type: String, default: "" } },
    render() { return h("p", { class: "text" }, this.text); },
  });
  const RootLayout = defineComponent({
    name: "RootLayout",
    props: { children: { type: [Object, Function], default: undefined } },
    render() {
      return h("main", { class: "root-layout" }, [this.children ? h(this.children) : null]);
    },
  });
  const config = {
    components: { Text: { fields: { text: { type: "text" } }, render: Text } },
    root: { render: RootLayout },
  };
  const data = { root: { props: {} }, content: [{ type: "Text", props: { id: "t1", text: "Body content" } }] };
  const { el } = mountApp(() => h(Render, { config, data }));
  await tick(150);
  const html = el.innerHTML;
  check("Root: custom Vue root renders", html.includes("root-layout"), html);
  check("Root: children (root DropZone) portals in via <component :is=children>", html.includes("Body content"), html);
}

async function testPuckEditorReady() {
  const Heading = defineComponent({
    name: "Heading",
    props: { title: { type: String, default: "" } },
    render() { return h("h1", { class: "vue-heading" }, this.title); },
  });
  const config = { components: { Heading: { fields: { title: { type: "text" } }, defaultProps: { title: "Hello" }, render: Heading } } };
  const data = { root: {}, content: [{ type: "Heading", props: { id: "h1", title: "Hi from Vue" } }] };

  let readyApi = null;
  let threw = null;
  try {
    mountApp(() => h(Puck, {
      config, data, iframe: { enabled: false },
      onReady: (getPuck) => { readyApi = getPuck; },
    }));
  } catch (e) { threw = e; }
  await tick(300);
  check("Puck: editor mounts without throwing", !threw, threw && threw.message);
  check("Puck: @ready fires", !!readyApi);
  let apiOk = false;
  if (readyApi) { try { const api = readyApi(); apiOk = !!(api && api.appState && api.dispatch); } catch (e) {} }
  check("Puck: getPuck() returns working PuckApi", apiOk);
}

async function testPuckEditorSlot() {
  const Text = defineComponent({
    name: "Text",
    props: { text: { type: String, default: "" } },
    render() { return h("p", { class: "slot-text" }, this.text); },
  });
  const Columns = defineComponent({
    name: "Columns",
    props: { items: { type: [Object, Function], default: undefined } },
    render() { return h("div", { class: "columns" }, [this.items ? h(this.items) : null]); },
  });
  const config = {
    components: {
      Columns: { fields: { items: { type: "slot" } }, render: Columns },
      Text: { fields: { text: { type: "text" } }, render: Text },
    },
  };
  const data = {
    root: {},
    content: [{ type: "Columns", props: { id: "col1", items: [{ type: "Text", props: { id: "t1", text: "Slot in editor" } }] } }],
  };
  let threw = null;
  let el;
  try {
    ({ el } = mountApp(() => h(Puck, { config, data, iframe: { enabled: false } })));
  } catch (e) { threw = e; }
  await tick(400);
  check("Puck slot: editor with slot mounts", !threw, threw && threw.message);
  const html = el ? el.innerHTML : "";
  check("Puck slot: nested Vue slot content renders in editor (editable DropZone portal)", html.includes("Slot in editor"), `len=${html.length}`);
}

async function testFieldLabel() {
  const { el } = mountApp(() =>
    h(FieldLabel, { label: "My Label" }, { default: () => h("input", { class: "fl-input" }) })
  );
  await tick(30);
  const html = el.innerHTML;
  check("FieldLabel: renders label + slot", html.includes("My Label") && html.includes("fl-input"), html);
  check("FieldLabel: applies core Input label class (CSS parity)", /Input-label|_Input-label|InputLabel/i.test(el.querySelector("label")?.querySelector("div")?.className || ""), el.querySelector("label")?.innerHTML);
}

async function testCustomVueField() {
  const TextControl = defineComponent({
    name: "TextControl",
    props: ["id", "name", "value", "onChange", "field", "readOnly"],
    setup(props) {
      return () =>
        h(FieldLabel, { label: (props.field && props.field.label) || props.name }, {
          default: () =>
            h("input", {
              class: "custom-field-input",
              value: props.value,
              onInput: (e) => props.onChange(e.target.value),
            }),
        });
    },
  });
  const Card = defineComponent({ name: "Card", props: { title: { type: String, default: "" } }, render() { return h("div", { class: "card" }, this.title); } });
  const config = {
    components: {
      Card: {
        fields: { title: { type: "custom", label: "Title", render: TextControl } },
        defaultProps: { title: "Hello" },
        render: Card,
      },
    },
  };
  // structural: transformConfig wraps custom field render into a function
  const transformed = transformConfig(config);
  check("Custom field: transformConfig wraps custom render", typeof transformed.components.Card.fields.title.render === "function");

  const data = { root: {}, content: [{ type: "Card", props: { id: "c1", title: "Hello" } }] };
  let readyApi = null;
  const { el } = mountApp(() => h(Puck, { config, data, iframe: { enabled: false }, onReady: (gp) => { readyApi = gp; } }));
  await tick(300);
  if (readyApi) readyApi().dispatch({ type: "setUi", ui: { itemSelector: { index: 0 } } });
  await tick(300);
  const html = el.innerHTML;
  check("Custom field: Vue field renders in editor fields panel", html.includes("custom-field-input"), `len=${html.length}`);

  // onChange round-trip: type into the Vue field → data updates.
  const input = el.querySelector(".custom-field-input");
  if (input) {
    input.value = "Changed via Vue field";
    input.dispatchEvent(new w.Event("input", { bubbles: true }));
    await tick(200);
  }
  const title = readyApi ? readyApi().appState.data.content[0].props.title : null;
  check("Custom field: onChange flows back to Puck data", title === "Changed via Vue field", `title=${title}`);

  // The preview must keep rendering the (updated) prop — guards against
  // transformed props being clobbered on selection-triggered re-renders.
  check(
    "Custom field: editor preview renders the updated prop",
    (el.textContent || "").includes("Changed via Vue field"),
    el.querySelector(".card")?.textContent
  );
}

async function testFieldVModel() {
  // The Vue adapter adds `modelValue` / `update:modelValue` to field props, so
  // field components can use the idiomatic v-model contract instead of the
  // React-style `onChange` prop.
  const VModelField = defineComponent({
    name: "VModelField",
    props: ["modelValue", "field"],
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      return () =>
        h("input", {
          class: "vmodel-field-input",
          value: props.modelValue,
          onInput: (e) => emit("update:modelValue", e.target.value),
        });
    },
  });
  const Card = defineComponent({ name: "Card", props: { title: { type: String, default: "" } }, render() { return h("div", { class: "card" }, this.title); } });
  const config = {
    components: {
      Card: {
        fields: { title: { type: "custom", label: "Title", render: VModelField } },
        render: Card,
      },
    },
  };
  const data = { root: {}, content: [{ type: "Card", props: { id: "c1", title: "Start" } }] };
  let readyApi = null;
  const { el } = mountApp(() => h(Puck, { config, data, iframe: { enabled: false }, onReady: (gp) => { readyApi = gp; } }));
  await tick(300);
  if (readyApi) readyApi().dispatch({ type: "setUi", ui: { itemSelector: { index: 0 } } });
  await tick(300);
  const input = el.querySelector(".vmodel-field-input");
  check("v-model field: renders with modelValue", !!input && input.value === "Start", input && input.value);
  if (input) {
    input.value = "Via v-model";
    input.dispatchEvent(new w.Event("input", { bubbles: true }));
    await tick(200);
  }
  const title = readyApi ? readyApi().appState.data.content[0].props.title : null;
  check("v-model field: update:modelValue flows back to Puck data", title === "Via v-model", `title=${title}`);
}

async function testUsePuckApi() {
  const Status = defineComponent({
    name: "Status",
    setup() {
      const selected = usePuckApi((api) => api.selectedItem);
      return { selected };
    },
    render() {
      return h("div", { class: "status" }, `selected=${this.selected ? this.selected.props.id : "none"}`);
    },
  });
  const config = { components: { Status: { fields: {}, render: Status } } };
  const data = { root: {}, content: [{ type: "Status", props: { id: "s1" } }] };
  let readyApi = null;
  const { el } = mountApp(() => h(Puck, { config, data, iframe: { enabled: false }, onReady: (gp) => { readyApi = gp; } }));
  await tick(300);
  check("usePuckApi: initial selection empty", el.textContent.includes("selected=none"), el.textContent);
  if (readyApi) readyApi().dispatch({ type: "setUi", ui: { itemSelector: { index: 0 } } });
  await tick(300);
  check("usePuckApi: selector updates reactively on dispatch", el.textContent.includes("selected=s1"), el.textContent);
}

async function testRichText() {
  // richtext fields are node-valued in BOTH editor and <Render> (core replaces
  // the value with a rendered element), so they ride the outlet protocol like
  // contentEditable text. The interactive tiptap editor is exercised in
  // apps/demo-vue; jsdom covers <Render> + the readonly editor path.
  const RichBody = defineComponent({
    name: "RichBody",
    props: { body: { type: [String, Object, Function], default: undefined } },
    render() {
      return h("article", { class: "rb" }, this.body ? [h(this.body)] : []);
    },
  });
  const data = {
    root: {},
    content: [{ type: "RB", props: { id: "rb1", body: "<p>Rich hello</p>" } }],
  };

  const config = { components: { RB: { fields: { body: { type: "richtext" } }, render: RichBody } } };
  const { el } = mountApp(() => h(Render, { config, data }));
  await tick(400); // RichTextRender is lazy; give the import a beat
  check("richtext: renders in <Render> via outlet", el.textContent.includes("Rich hello"), el.innerHTML.slice(0, 300));
  check("richtext: no [object Object] leak in <Render>", !el.innerHTML.includes("[object Object]"));

  const roConfig = { components: { RB: { fields: { body: { type: "richtext", contentEditable: false } }, render: RichBody } } };
  let el2;
  try {
    ({ el: el2 } = mountApp(() => h(Puck, { config: roConfig, data, iframe: { enabled: false } })));
  } catch (e) {
    /* ignore */
  }
  await tick(400);
  const html = el2 ? el2.innerHTML : "";
  check("richtext: renders in editor via outlet (readonly)", el2 && el2.textContent.includes("Rich hello"), `len=${html.length}`);
  check("richtext: no [object Object] leak in editor", !html.includes("[object Object]"));
}

async function testContentEditable() {
  // A text field with contentEditable: core swaps the string value for an
  // <InlineTextField> Preact element in the editor (plain string in <Render>).
  // The bridge portals it via the outlet protocol; the component renders it with
  // <component :is>.
  const EditableHeading = defineComponent({
    name: "EditableHeading",
    props: { title: { type: [String, Object, Function], default: undefined } },
    render() {
      return h("h1", { class: "eh" }, this.title ? [h(this.title)] : []);
    },
  });
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
  const { el: renderEl } = mountApp(() => h(Render, { config, data }));
  await tick(120);
  check(
    "contentEditable: renders as text in <Render>",
    renderEl.textContent.includes("Editable Hi") &&
      renderEl.innerHTML.includes('class="eh"'),
    renderEl.innerHTML.slice(0, 200)
  );
  check(
    "contentEditable: no [object Object] leak in <Render>",
    !renderEl.innerHTML.includes("[object Object]")
  );

  // Editor: value is an <InlineTextField> element, portaled as editable.
  let el;
  try {
    ({ el } = mountApp(() =>
      h(Puck, { config, data, iframe: { enabled: false } })
    ));
  } catch (e) {
    /* ignore */
  }
  await tick(300);
  const html = el ? el.innerHTML : "";
  check(
    "contentEditable: inline-editable element renders in editor",
    html.includes("Editable Hi") && /contenteditable/i.test(html),
    `len=${html.length}`
  );
  check(
    "contentEditable: no [object Object] leak in editor",
    !html.includes("[object Object]")
  );
}

(async () => {
  await testRenderPlainProps();
  await testPatchAndStatePersistence();
  await testSlotOutlet();
  await testRootChildren();
  await testFieldLabel();
  await testPuckEditorReady();
  await testPuckEditorSlot();
  await testCustomVueField();
  await testFieldVModel();
  await testUsePuckApi();
  await testContentEditable();
  await testRichText();

  console.log("\n@puckeditor/vue bridge smoke tests\n");
  console.log(results.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
})();
