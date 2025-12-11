import { lazy, Suspense } from "react";
import { AlignSelectFallback } from "./fallback";

const AlignSelectLoaded = lazy(() =>
  import("./loaded").then((m) => ({
    default: m.AlignSelectLoaded,
  }))
);

export const AlignSelect = () => (
  <Suspense fallback={<AlignSelectFallback />}>
    <AlignSelectLoaded />
  </Suspense>
);
