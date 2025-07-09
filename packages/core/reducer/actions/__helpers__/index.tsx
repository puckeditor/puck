import { PuckAction, createReducer } from "../../../reducer";
import { ComponentData, Config, Data, Slot, UiState } from "../../../types";
import { generateId } from "../../../lib/generate-id";
import {
  createAppStore,
  defaultAppState as _defaultAppState,
} from "../../../store";
import { PrivateAppState } from "../../../types/Internal";
import { stripSlots } from "../../../lib/data/strip-slots";
import { Reducer } from "react";
import { flattenNode } from "../../../lib/data/flatten-node";

jest.mock("../../../lib/generate-id");

const mockedGenerateId = generateId as jest.MockedFunction<typeof generateId>;

type Props = {
  Comp: {
    prop: string;
    slot: Slot;
    slotArray: { slot: Slot }[];
  };
  CompWithDefaults: {
    prop: string;
    slot: Slot;
    slotArray: { slot: Slot }[];
  };
};

type RootProps = {
  title: string;
  slot: Slot;
};

export type UserConfig = Config<Props, RootProps>;
export type UserData = Data<Props, RootProps>;

export const dzZoneCompound = "my-component:zone1";

export const defaultData: UserData = {
  root: { props: { title: "", slot: [] } },
  content: [],
  zones: { [dzZoneCompound]: [] },
};

export const defaultUi: UiState = _defaultAppState.ui;

export const defaultIndexes: PrivateAppState<UserData>["indexes"] = {
  nodes: {},
  zones: {
    "root:slot": { contentIds: [], type: "slot" },
    [dzZoneCompound]: { contentIds: [], type: "dropzone" },
  },
};

export const defaultState = {
  data: defaultData,
  ui: defaultUi,
  indexes: defaultIndexes,
};

export const appStore = createAppStore();

const config: UserConfig = {
  root: {
    fields: { title: { type: "text" }, slot: { type: "slot" } },
  },
  components: {
    Comp: {
      fields: {
        prop: { type: "text" },
        slot: { type: "slot" },
        slotArray: { type: "array", arrayFields: { slot: { type: "slot" } } },
      },
      defaultProps: { prop: "example", slot: [], slotArray: [] },
      render: () => <div />,
    },
    CompWithDefaults: {
      fields: {
        prop: { type: "text" },
        slot: { type: "slot" },
        slotArray: { type: "array", arrayFields: { slot: { type: "slot" } } },
      },
      defaultProps: {
        prop: "example",
        slot: [
          {
            type: "Comp",
            props: {
              prop: "Defaulted item",
              slots: [],
            },
          },
        ],
        slotArray: [],
      },
      render: () => <div />,
    },
  },
};

export const expectIndexed = (
  state: PrivateAppState,
  item: ComponentData | undefined,
  path: string[],
  index: number,
  _config: Config = config
) => {
  if (!item) return;

  const zoneCompound = path[path.length - 1];

  expect(state.indexes.zones[zoneCompound].contentIds[index]).toEqual(
    item.props.id
  );
  expect(state.indexes.nodes[item.props.id].data).toEqual(item);
  expect(state.indexes.nodes[item.props.id].flatData).toEqual(
    flattenNode(item, _config)
  );
  expect(state.indexes.nodes[item.props.id].path).toEqual(path);
};

export const executeSequenceFactory =
  (reducer: Reducer<any, any>) =>
  <UserData extends Data>(
    initialState: PrivateAppState<UserData>,
    actions: ((currentState: PrivateAppState<UserData>) => PuckAction)[]
  ) => {
    let currentState: PrivateAppState<UserData> = initialState;

    actions.forEach((actionFn) => {
      const action = actionFn(currentState);

      currentState = reducer(currentState, action) as PrivateAppState<UserData>;
    });

    return currentState;
  };

export const testSetup = () => {
  let _reducer = createReducer({ appStore: appStore.getState() });

  const beforeEachFn = () => {
    const newStore = {
      ...appStore.getInitialState(),
      config,
    };

    appStore.setState(newStore, true);

    _reducer = createReducer({ appStore: newStore });

    let counter = 0;

    mockedGenerateId.mockImplementation(() => `mockId-${counter++}`);
  };

  beforeEach(beforeEachFn);

  const executeSequence = (
    initialState: PrivateAppState<UserData>,
    actions: ((currentState: PrivateAppState<UserData>) => PuckAction)[]
  ) => {
    let currentState: PrivateAppState<UserData> = initialState;

    actions.forEach((actionFn) => {
      const action = actionFn(currentState);

      currentState = _reducer(
        currentState,
        action
      ) as PrivateAppState<UserData>;
    });

    return currentState;
  };

  const reducer = (state: PrivateAppState, action: PuckAction) =>
    _reducer(state, action);

  return { reducer, executeSequence, config };
};
