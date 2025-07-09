import { RegisterZoneAction, UnregisterZoneAction } from "..";
import { setupZone } from "../../lib/data/setup-zone";
import { Content, Data } from "../../types";
import { PrivateAppState } from "../../types/Internal";

// Restore unregistered zones when re-registering in same session
export const zoneCache: Record<string, Content> = {};

export const addToZoneCache = (key: string, data: Content) => {
  zoneCache[key] = data;
};

export function registerZoneAction<UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: RegisterZoneAction
): PrivateAppState<UserData> {
  if (zoneCache[action.zone]) {
    return {
      ...state,
      data: {
        ...state.data,
        zones: {
          ...state.data.zones,
          [action.zone]: zoneCache[action.zone],
        },
      },
      indexes: {
        ...state.indexes,
        zones: {
          ...state.indexes.zones,
          [action.zone]: {
            ...state.indexes.zones[action.zone],
            contentIds: zoneCache[action.zone].map((item) => item.props.id),
            type: "dropzone",
          },
        },
      },
    };
  }

  return { ...state, data: setupZone(state.data, action.zone) };
}

export function unregisterZoneAction<UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: UnregisterZoneAction
): PrivateAppState<UserData> {
  const _zones = { ...(state.data.zones || {}) };
  const zoneIndex = { ...(state.indexes.zones || {}) };

  if (_zones[action.zone]) {
    zoneCache[action.zone] = _zones[action.zone];

    delete _zones[action.zone];
  }

  delete zoneIndex[action.zone];

  return {
    ...state,
    data: {
      ...state.data,
      zones: _zones,
    },
    indexes: {
      ...state.indexes,
      zones: zoneIndex,
    },
  };
}
