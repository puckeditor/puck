import { ActionModal } from "@/packages/platform-client/components/ActionModal";
import { useModal } from "@/packages/platform-client/components/Modal/Modal";
import { AutoField } from "@puckeditor/core";
import { Cable } from "lucide-react";
import { useMemo } from "react";
import { cxConnectedField } from "../styles";

export function ConnectedFieldModal({
  value,
  onChange,
  options,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (_selectedValue: string) => void;
}) {
  const { setVisible } = useModal();

  const optionsWithDefault = useMemo(
    () => [{ label: "Select field...", value: "" }, ...options],
    [options]
  );
  const selectedLabel =
    optionsWithDefault.find((option) => option.value === value)?.label ?? "";

  return (
    <div
      className={cxConnectedField("connect")}
      onClick={(e) => {
        e.preventDefault();
      }}
    >
      <button
        className={cxConnectedField("connectButton")}
        onClick={() => {
          setVisible(true);
        }}
      >
        <div className={cxConnectedField("connectButtonIcon")}>
          <Cable size="16" />
        </div>
        <div className={cxConnectedField("connectButtonLabel")}>
          {value && selectedLabel ? selectedLabel : "Connect"}
        </div>
      </button>
      <ActionModal hideButton title="Connect field">
        <AutoField
          field={{ type: "select", options: optionsWithDefault }}
          value={value}
          onChange={onChange}
        />
      </ActionModal>
    </div>
  );
}
