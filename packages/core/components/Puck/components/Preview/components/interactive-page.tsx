import { useAppStore } from "../../../../../store";

import { FieldTransforms } from "../../../../../types";

import { Render } from "../../../../Render";

/**
 * Renders the puck data in the editor where this component is rendered as an interactive page.
 */
const InteractivePage = () => {
  const config = useAppStore((s) => s.config);
  const metadata = useAppStore((s) => s.metadata);
  const renderData = useAppStore((s) => s.state.data);
  const userFieldTransforms = useAppStore((s) => s.fieldTransforms);

  const fieldTransforms = userFieldTransforms as FieldTransforms<typeof config>;

  return (
    <Render
      data={renderData}
      config={config}
      metadata={metadata}
      fieldTransforms={fieldTransforms}
    />
  );
};

export default InteractivePage;
