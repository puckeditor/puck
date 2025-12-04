import { lazy, Suspense } from "react";
import { HeadingSelectFallback } from "./fallback";

const HeadingSelectLoaded = lazy(() =>
  import("./loaded").then((m) => ({
    default: m.HeadingSelectLoaded,
  }))
);

export const HeadingSelect = () => (
  <Suspense fallback={<HeadingSelectFallback />}>
    <HeadingSelectLoaded />
  </Suspense>
);
