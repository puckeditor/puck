// Headless smoke tests for the @puckeditor/vue bridge, exercising the BUILT
// bundle (dist/index.js) in jsdom. Run after building: `node scripts/smoke`.
//
// These validate the Vue<->Preact bridge mechanics (mount, patch-in-place,
// state persistence, slots, custom fields, editor `ready`) without a browser.
// Full drag/overlay behaviour is verified in apps/demo-vue.
const { setupDom, tick } = require("./env.cjs");
const dom = setupDom();
const w = dom.window;

const Vue = require("vue");
const { defineComponent, h, reactive, createApp, nextTick } = Vue;
const puck = require("../../dist/index.js");
const { Render, Puck, usePuck, FieldLabel, transformConfig } = puck;

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
      const ctx = usePuck();
      return { localState, ctx };
    },
    render() {
      return h("div", { class: "card" }, `label=${this.label} state=${this.localState} editing=${this.ctx.isEditing}`);
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

  console.log("\n@puckeditor/vue bridge smoke tests\n");
  console.log(results.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
})();
