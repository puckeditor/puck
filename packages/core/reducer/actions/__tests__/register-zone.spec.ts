import { RegisterZoneAction, UnregisterZoneAction } from "../..";
import { PrivateAppState } from "../../../types/Internal";
import { defaultData, defaultState, testSetup } from "../__helpers__";

describe("Reducer", () => {
  const { reducer } = testSetup();

  describe("registerZone action", () => {
    it("should register a zone that's been previously unregistered", () => {
      const state: PrivateAppState = {
        ...defaultState,
        data: {
          ...defaultData,
          zones: { zone1: [{ type: "Comp", props: { id: "1" } }] },
        },
      };

      const unregisterAction: UnregisterZoneAction = {
        type: "unregisterZone",
        zone: "zone1",
      };

      const registerAction: RegisterZoneAction = {
        type: "registerZone",
        zone: "zone1",
      };

      const newState = reducer(
        reducer(state, unregisterAction),
        registerAction
      );
      expect(newState.data.zones?.zone1[0].props.id).toEqual("1");
    });
  });

  describe("unregisterZone action", () => {
    it("should unregister a zone", () => {
      const state: PrivateAppState = {
        ...defaultState,
        data: {
          ...defaultData,
          zones: { zone1: [{ type: "Comp", props: { id: "1" } }] },
        },
      };

      const action: UnregisterZoneAction = {
        type: "unregisterZone",
        zone: "zone1",
      };

      const newState = reducer(state, action);
      expect(newState.data.zones?.zone1).toBeUndefined();
    });
  });
});
