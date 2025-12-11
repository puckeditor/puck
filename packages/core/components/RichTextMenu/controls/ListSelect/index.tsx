import { lazy, Suspense } from "react";
import { ListSelectFallback } from "./fallback";

const ListSelectLoaded = lazy(() =>
  import("./loaded").then((m) => ({
    default: m.ListSelectLoaded,
  }))
);

export const ListSelect = () => (
  <Suspense fallback={<ListSelectFallback />}>
    <ListSelectLoaded />
  </Suspense>
);
