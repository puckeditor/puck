import { ComponentConfig, Field } from "@puckeditor/core";

import mapObjectValues from "../utils/map-object-values";

type TransformField = (field: Field) => Field;

/**
 * Recursively transforms a field and its nested fields.
 *
 * @param field The field to transform
 * @param transformField The function to apply to each field
 * @returns The transformed field
 */
export const recurseField = (
  field: Field,
  transformField: TransformField
): Field => {
  const newFields = transformField(field);

  if (newFields.type === "array" && newFields.arrayFields) {
    newFields.arrayFields = mapObjectValues(newFields.arrayFields, (field) =>
      recurseField(field, transformField)
    );
  } else if (newFields.type === "object" && newFields.objectFields) {
    newFields.objectFields = mapObjectValues(newFields.objectFields, (field) =>
      recurseField(field, transformField)
    );
  }

  return newFields;
};

/**
 * Transforms all fields in a component config using the provided function.
 *
 * @param componentConfig The component config to transform
 * @param transformField The function to apply to each field
 * @returns The transformed component config
 */
const transformFields = <T extends Pick<ComponentConfig, "fields">>(
  componentConfig: T,
  transformField: TransformField
): T => {
  if (!componentConfig.fields) {
    return componentConfig;
  }

  const newConfig = {
    ...componentConfig,
  };

  newConfig.fields = mapObjectValues(componentConfig.fields, (field) =>
    recurseField(field, transformField)
  );

  return newConfig;
};

export default transformFields;
