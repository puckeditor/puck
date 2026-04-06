import { Button } from "@/packages/core";
import { useModal } from "@/packages/platform-client/components/Modal/Modal";

export function ViewConnectAction({ onConnect }: { onConnect: () => void }) {
  const { setVisible } = useModal();

  return (
    <Button
      onClick={() => {
        onConnect();
        setVisible(false);
      }}
    >
      Connect
    </Button>
  );
}
