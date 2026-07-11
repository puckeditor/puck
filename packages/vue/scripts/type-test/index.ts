/**
 * Type-level test for @puckeditor/vue's built declarations. Compile-only:
 * `yarn check-types`.
 */
/* eslint-disable react-hooks/rules-of-hooks -- Vue composables, not React hooks */
import { createApp, toRefs } from "vue";
import {
  Puck,
  Render,
  FieldLabel,
  usePuck,
  usePuckApi,
  transformConfig,
  defineVueField,
  migrate,
  type VueConfig,
  type VueSlot,
  type PuckApi,
  type Data,
} from "@puckeditor/vue";

declare const config: VueConfig;
declare const data: Partial<Data>;

// Vue components mount as app roots with Vue-flavored props.
createApp(Puck, {
  config,
  data,
  iframe: { enabled: false },
  onChange: (d: Data) => void d,
  onReady: (getPuck: () => PuckApi) => void getPuck().dispatch,
});
createApp(Render, { config, data });
createApp(FieldLabel, { label: "Title", readOnly: true });

// Context + reactive selector accessors.
const puck = usePuck();
const _editing: boolean = puck.isEditing;
void _editing;
const { metadata } = toRefs(usePuck());
void metadata.value;

const selected = usePuckApi((api) => api.selectedItem);
void selected.value?.props;

// Per-component prop inference via the Props generic.
type Props = { Heading: { title: string } };
declare const typedConfig: VueConfig<Props>;
const _defaultTitle: string | undefined =
  typedConfig.components.Heading.defaultProps?.title;
void _defaultTitle;

// Node-valued field props are outlet components.
declare const slot: VueSlot;
void slot;

// Framework-agnostic surface stays available.
void transformConfig(config);
void defineVueField;
void migrate;
