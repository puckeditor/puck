/**
 * Type-level test for the Svelte-facing declarations (svelte/index.d.ts),
 * resolved the way a Svelte app resolves the package (the `svelte` export
 * condition — see tsconfig.json's `customConditions`). Compile-only:
 * `yarn check-types`.
 */
import {
  Puck,
  Render,
  PuckSlot,
  PuckText,
  PuckDropZone,
  FieldLabel,
  getPuck,
  puckApi,
  transformConfig,
  defineSvelteField,
  migrate,
  type SvelteConfig,
  type SveltePuckProps,
  type PuckApi,
  type Data,
} from "@puckeditor/svelte";
import { mount } from "svelte";

declare const config: SvelteConfig;
declare const data: Partial<Data>;
declare const el: HTMLElement;

// <Puck> mounts as a Svelte component with Svelte-flavored props.
mount(Puck, {
  target: el,
  props: {
    config,
    data,
    iframe: { enabled: false },
    context: new Map(),
    onchange: (d) => {
      const _d: Data = d;
      void _d;
    },
    onready: (getPuckApi) => {
      const api: PuckApi = getPuckApi();
      void api.dispatch;
    },
  } satisfies SveltePuckProps,
});

mount(Render, { target: el, props: { config, data } });
mount(PuckSlot, { target: el, props: { name: "content", minEmptyHeight: 128 } });
mount(PuckText, { target: el, props: { name: "title" } });
mount(PuckDropZone, { target: el, props: { zone: "z" } });
mount(FieldLabel, { target: el, props: { label: "Title", readOnly: true } });

// @ts-expect-error — PuckSlot requires `name`
mount(PuckSlot, { target: el, props: {} });

// Context + reactive selector accessors.
const puck = getPuck();
const _editing: boolean = puck.isEditing;
void _editing;

const selected = puckApi((api) => api.selectedItem);
void selected.current?.props;

// Per-component prop inference via the Props generic.
type Props = { Heading: { title: string } };
declare const typedConfig: SvelteConfig<Props>;
const _defaultTitle: string | undefined =
  typedConfig.components.Heading.defaultProps?.title;
void _defaultTitle;

// Framework-agnostic surface stays available.
void transformConfig(config);
void defineSvelteField;
void migrate;
