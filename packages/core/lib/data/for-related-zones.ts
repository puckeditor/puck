import { Content, Data } from "../../types";
import { getZoneId } from "../get-zone-id";

export function forRelatedZones<UserData extends Data>(
  item: UserData["content"][0],
  data: UserData,
  cb: (path: string[], zoneCompound: string, content: Content) => void,
  path: string[] = []
) {
  Object.entries(data.zones || {}).forEach(([zoneCompound, content]) => {
    const [parentId] = getZoneId(zoneCompound);

    if (parentId === item.props.id) {
      cb(path, zoneCompound, content);
    }
  });
}
