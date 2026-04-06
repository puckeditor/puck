import { ActionModal } from "@/packages/platform-client/components/ActionModal";
import { Button } from "@/packages/core";
import { useModal } from "@/packages/platform-client/components/Modal/Modal";
import { Cable } from "lucide-react";
import { useState } from "react";
import { cxConnectedField } from "../styles";

export function ConnectedArrayModal({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (_nextValue: boolean) => Promise<void> | void;
}) {
  const { setVisible } = useModal();
  const [loading, setLoading] = useState(false);

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
          {value ? "Connected" : "Connect"}
        </div>
      </button>
      <ActionModal hideButton title="Connect array">
        <Button
          disabled={loading}
          onClick={async () => {
            setLoading(true);

            await onChange(!value);

            setLoading(false);
            setVisible(false);
          }}
        >
          {value ? "Disconnect" : "Connect array"}
        </Button>
      </ActionModal>
    </div>
  );
}
