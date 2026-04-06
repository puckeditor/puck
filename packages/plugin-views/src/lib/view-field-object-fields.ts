import type { ReferenceOption } from "../types";

export const buildViewFieldObjectFields = ({
  viewFields,
  references,
}: {
  viewFields: Record<string, any>;
  references?: ReferenceOption[];
}) => {
  return Object.keys(viewFields).reduce((acc, fieldName) => {
    const field = viewFields[fieldName];

    if (field.type === "reference") {
      if (references) {
        return {
          ...acc,
          [fieldName]: {
            ...field,
            type: "select",
            options: [
              { label: "Select reference", value: "" },
              ...references.map((reference) => ({
                label: reference.label,
                value: { reference: reference.value },
              })),
            ],
          },
        };
      }

      return acc;
    }

    return { ...acc, [fieldName]: field };
  }, {});
};
