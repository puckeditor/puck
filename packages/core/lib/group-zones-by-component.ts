import { getZoneId } from "./get-zone-id";
import { Data, Content } from "../types";

export const groupZonesByComponent = (data: Data) => {
  const zoneEntries = Object.entries(data.zones ?? {});

  return zoneEntries.reduce<
    Record<string, { zoneCompound: string; content: Content }[]>
  >((acc, [zoneCompound, zoneContent]) => {
    const [componentId, zoneName] = getZoneId(zoneCompound);

    if (!componentId.length || !zoneName.length) return acc;

    if (!acc[componentId]) {
      acc[componentId] = [];
    }

    acc[componentId].push({ zoneCompound, content: zoneContent });

    return acc;
  }, {});
};
