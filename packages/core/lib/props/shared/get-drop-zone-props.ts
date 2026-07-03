import type {
  ConsumedPropKey,
  NonForwardableProps,
} from "../../../components/DropZone/types";

type NonForwardableKey = keyof NonForwardableProps;

type DropZonePropGroups<Props> = {
  /** Props consumed by Puck internally. */
  props: Pick<Props, Extract<keyof Props, ConsumedPropKey>>;
  /** Props that should be forwarded to the element or component provided via `as`. */
  forwardableProps: Omit<Props, ConsumedPropKey | NonForwardableKey>;
  /** Props that shouldn't be forwarded to the component provided via `as` (e.g., `children` and `dangerouslySetInnerHTML`). */
  nonForwardableProps: Pick<Props, Extract<keyof Props, NonForwardableKey>>;
};

// Key maps with all the consumed and non-forwardable keys -----------------------------------------------

// Note to future maintainers: When adding new keys to the DropZone props, add them to the appropriate map below.
//
// `Record<Key, true>` makes these compile errors if a key
// is added to (or removed from) the source types without updating them here, keeping
// the runtime in sync with the type public interface.

const CONSUMED_PROP_KEYS: Record<ConsumedPropKey, true> = {
  zone: true,
  allow: true,
  disallow: true,
  style: true,
  minEmptyHeight: true,
  className: true,
  collisionAxis: true,
  ref: true,
  as: true,
  content: true,
  config: true,
  metadata: true,
};

const NON_FORWARDABLE_PROP_KEYS: Record<NonForwardableKey, true> = {
  children: true,
  dangerouslySetInnerHTML: true,
};

const CONSUMED_KEY_SET: ReadonlySet<string> = new Set(
  Object.keys(CONSUMED_PROP_KEYS)
);
const NON_FORWARDABLE_KEY_SET: ReadonlySet<string> = new Set(
  Object.keys(NON_FORWARDABLE_PROP_KEYS)
);

/**
 * Groups the props received from a user dropzone or slot render function into the groups Puck cares about.
 *
 * Central formatting point that should be shared by any component rendering DropZones/slots.
 *
 * `allProps` are grouped by reference in a single pass, never cloned or merged, so
 * downstream identity (and memoization) is unaffected.
 *
 * @param allProps The component's full incoming props, as received from the user dropzone or slot render function.
 * @returns An object containing the three prop groups: {@link DropZonePropGroups.props props}, {@link DropZonePropGroups.forwardableProps forwardableProps}, and {@link DropZonePropGroups.nonForwardableProps nonForwardableProps}.
 */
export const getDropZoneProps = <Props extends Record<string, any>>(
  allProps: Props
): DropZonePropGroups<Props> => {
  // Null-prototype so an own `__proto__` key is stored as data instead of
  // mutating the target's prototype (prototype pollution / lost key).
  const props: Record<string, unknown> = Object.create(null);
  const forwardableProps: Record<string, unknown> = Object.create(null);
  const nonForwardableProps: Record<string, unknown> = Object.create(null);

  for (const key of Object.keys(allProps)) {
    if (NON_FORWARDABLE_KEY_SET.has(key)) {
      console.warn(
        "The following prop is not supported by Puck DropZones or slots and will not be forwarded to the `as` element:",
        key
      );
      nonForwardableProps[key] = allProps[key];
    } else if (CONSUMED_KEY_SET.has(key)) {
      props[key] = allProps[key];
    } else {
      forwardableProps[key] = allProps[key];
    }
  }

  return {
    props,
    forwardableProps,
    nonForwardableProps,
  } as DropZonePropGroups<Props>;
};
