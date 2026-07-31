import { ObjectField, RichtextField, SlotField } from "@/core/types";
import { HeroProps } from "./Hero";
import { Components, UserField } from "../../types";

export const heroRenderFields = {
  description: {
    type: "richtext",
  } satisfies RichtextField,
  image: {
    type: "object",
    objectFields: {
      content: {
        type: "slot",
      } satisfies SlotField<keyof Components>,
    },
  } satisfies ObjectField<HeroProps["image"], UserField, keyof Components>,
};
