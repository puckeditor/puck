import { cleanup } from "@testing-library/react";
import { ComponentData, Config, RootDataWithProps } from "../../types";
import { PuckAction } from "../../reducer";
import { insertComponent } from "../insert-component";
import { rootDroppableId } from "../root-droppable-id";

import { createAppStore } from "../../store";

const appStore = createAppStore();

const config: Config = {
  components: {
    MyComponent: {
      fields: {
        prop: { type: "text" },
        object: { type: "object", objectFields: { slot: { type: "slot" } } },
      },
      defaultProps: {
        prop: "Unresolved",
        object: {
          slot: [
            {
              type: "MyComponent",
              props: {
                prop: "Unresolved",
                object: { slot: [] },
              },
            },
          ],
        },
      },
      resolveData: ({ props }) => {
        return {
          props: {
            ...props,
            prop: "Hello, world",
          },
          readOnly: {
            prop: true,
          },
        };
      },
      render: () => <div />,
    },
  },
};

type ComponentOrRootData = ComponentData | RootDataWithProps;

describe("use-insert-component", () => {
  describe("insert-component", () => {
    let dispatchedEvents: PuckAction[] = [];
    let resolvedDataEvents: ComponentOrRootData[] = [];
    let resolvedTrigger: string = "";

    beforeEach(() => {
      appStore.setState(
        {
          ...appStore.getInitialState(),
          config,
          dispatch: (action) => {
            dispatchedEvents.push(action);
          },
          resolveComponentData: async (data, trigger) => {
            resolvedDataEvents.push(data);

            resolvedTrigger = trigger;

            return data as any;
          },
        },
        true
      );
    });

    afterEach(() => {
      cleanup();
      dispatchedEvents = [];
      resolvedDataEvents = [];
    });

    it("should dispatch the insert action", async () => {
      insertComponent("MyComponent", rootDroppableId, 0, appStore);

      expect(dispatchedEvents[0]).toEqual<PuckAction>({
        type: "insert",
        componentType: "MyComponent",
        destinationZone: rootDroppableId,
        destinationIndex: 0,
        id: expect.stringContaining("MyComponent-"),
        recordHistory: true,
      });
    });

    it("should dispatch the setUi action, and select the item", async () => {
      insertComponent("MyComponent", rootDroppableId, 0, appStore);

      expect(dispatchedEvents[1]).toEqual<PuckAction>({
        type: "setUi",
        ui: {
          itemSelector: {
            zone: rootDroppableId,
            index: 0,
          },
        },
      });
    });

    it("should run any resolveData methods on the inserted item", async () => {
      insertComponent("MyComponent", rootDroppableId, 0, appStore);

      expect(resolvedDataEvents[0]).toEqual({
        type: "MyComponent",
        props: {
          id: expect.stringContaining("MyComponent-"),
          prop: "Unresolved",
          object: {
            slot: [
              {
                type: "MyComponent",
                props: {
                  id: expect.stringContaining("MyComponent-"),
                  prop: "Unresolved",
                  object: { slot: [] },
                },
              },
            ],
          },
        },
      });

      expect(resolvedTrigger).toEqual("insert");
    });
  });
});
