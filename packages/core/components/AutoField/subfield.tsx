import { memo } from "react";
import { AutoFieldPrivate } from ".";
import { NestedFieldProvider, useNestedFieldContext } from "./context";
import { Field } from "../../types";

const SubFieldInternal = ({
  field,
  id,
  index,
  name,
  subName,
  localName,
  onChange,
  forceReadOnly,
}: {
  id: string;
  index?: number;
  field: Field;
  subName: string;
  name?: string;
  localName?: string;
  onChange: (val: any, ui: any, subName: string) => void;
  forceReadOnly: boolean;
}) => {
  const indexName = typeof index !== "undefined" ? `${name}[${index}]` : name;
  const subPath = name ? `${indexName}.${subName}` : subName;
  const localIndexName =
    typeof index !== "undefined"
      ? `${localName}[${index}]`
      : localName ?? subName;
  const localWildcardName =
    typeof index !== "undefined" ? `${localName}[*]` : localName;
  const localSubPath = `${localIndexName}.${subName}`;
  const localWildcardSubPath = `${localWildcardName}.${subName}`;

  const { readOnlyFields } = useNestedFieldContext();

  const subReadOnly = forceReadOnly
    ? forceReadOnly
    : typeof readOnlyFields[subPath] !== "undefined"
    ? readOnlyFields[localSubPath]
    : readOnlyFields[localWildcardSubPath];

  const label = field.label || subName;

  return (
    <NestedFieldProvider
      name={localIndexName}
      wildcardName={localWildcardName}
      subName={subName}
      readOnlyFields={readOnlyFields}
    >
      <AutoFieldPrivate
        name={subPath}
        label={label}
        id={id}
        readOnly={subReadOnly}
        field={{
          ...field,
          label, // May be used by custom fields
        }}
        onChange={(val, ui) => {
          onChange(val, ui, subName);
        }}
      />
    </NestedFieldProvider>
  );
};

export const SubField = memo(SubFieldInternal);
