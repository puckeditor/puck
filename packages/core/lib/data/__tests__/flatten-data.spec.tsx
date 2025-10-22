import { Config, Data, Slot, UiState } from "../../../types";
import { flattenData } from "../flatten-data";
import { PrivateAppState } from "../../../types/Internal";
import {
  createAppStore,
  defaultAppState as _defaultAppState,
} from "../../../store";

type Props = {
  Heading: {
    title: string;
  };
  Container: {
    Content: Slot;
  };
};

type RootProps = {
  title: string;
  slot: Slot;
};

type UserConfig = Config<Props, RootProps>;
type UserData = Data<Props, RootProps>;

const dzZoneCompound = "container-component:zone1";

const defaultData: UserData = {
  root: { props: { title: "", slot: [] } },
  content: [],
  zones: { [dzZoneCompound]: [] },
};

const defaultUi: UiState = _defaultAppState.ui;

const defaultIndexes: PrivateAppState<UserData>["indexes"] = {
  nodes: {},
  zones: {
    "root:slot": { contentIds: [], type: "slot" },
    [dzZoneCompound]: { contentIds: [], type: "dropzone" },
  },
};

const defaultState = {
  data: defaultData,
  ui: defaultUi,
  indexes: defaultIndexes,
};

const appStore = createAppStore();

const config: UserConfig = {
  root: {
    fields: { title: { type: "text" }, slot: { type: "slot" } },
  },
  components: {
    Heading: {
      fields: {
        title: { type: "text" },
      },
      defaultProps: { title: "Title" },
      resolvePermissions: () => {
        return {
          drag: false,
          duplicate: false,
          delete: false,
          edit: false,
        };
      },
      render: () => <div />,
    },
    Container: {
      fields: {
        Content: { type: "slot" },
      },
      defaultProps: {
        Content: [],
      },
      render: () => <div />,
    },
  },
};

const mockState: PrivateAppState = {
  ...defaultState,
  data: {
    ...defaultData,
    content: [
      {
        type: "Container",
        props: {
          id: "container-component",
          Content: [
            {
              type: "Heading",
              props: {
                title: "Nested Title",
                id: "heading-component",
              },
            },
          ],
        },
      },
    ],
    zones: {},
  },
};

describe("flatten-data", () => {
  beforeEach(() => {
    appStore.setState(
      {
        ...appStore.getInitialState(),
        config,
      },
      true
    );
  });

  it("should flatten data correctly", () => {
    const result = flattenData(mockState, config);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Should contain the root component
    const rootComponent = result.find((item) => item.props.id === "root");
    expect(rootComponent).toBeDefined();
    expect(rootComponent?.type).toBe("root");

    // Should contain the Container component
    const containerComponent = result.find(
      (item) => item.props.id === "container-component"
    );
    expect(containerComponent).toBeDefined();
    expect(containerComponent?.type).toBe("Container");

    // Should contain the Heading component
    const headingComponent = result.find(
      (item) => item.props.id === "heading-component"
    );
    expect(headingComponent).toBeDefined();
    expect(headingComponent?.type).toBe("Heading");
    expect(headingComponent?.props.title).toBe("Nested Title");
  });

  it("should return components for empty content", () => {
    const emptyContentState: PrivateAppState = {
      ...defaultState,
      data: {
        ...defaultData,
        content: [],
        zones: {},
      },
    };

    const result = flattenData(emptyContentState, config);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Should still contain root even with empty content
    const rootComponent = result.find((item) => item.props.id === "root");
    expect(rootComponent).toBeDefined();
  });
});
