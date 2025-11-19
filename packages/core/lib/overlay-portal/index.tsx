import "./styles.css";

export const registerOverlayPortal = (
  el: HTMLElement | null | undefined,
  opts: {
    disableDrag?: boolean;
    disableDragOnFocus?: boolean;
  } = {}
) => {
  if (!el) return;

  const { disableDrag = false, disableDragOnFocus = true } = opts;

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  el.addEventListener("mouseover", stopPropagation, {
    capture: true,
  });

  const onFocus = () => {
    setTimeout(() => {
      el.addEventListener("pointerdown", stopPropagation, {
        capture: true,
      });
    }, 200);
  };

  const onBlur = () => {
    el.removeEventListener("pointerdown", stopPropagation, {
      capture: true,
    });
  };

  if (disableDrag) {
    el.addEventListener("pointerdown", stopPropagation, {
      capture: true,
    });
  } else if (disableDragOnFocus) {
    el.addEventListener("focus", onFocus, { capture: true });
    el.addEventListener("blur", onBlur, { capture: true });
  }

  el.setAttribute("data-puck-overlay-portal", "true");

  return () => {
    el.removeEventListener("mouseover", stopPropagation, {
      capture: true,
    });

    if (disableDrag) {
      el.removeEventListener("pointerdown", stopPropagation, {
        capture: true,
      });
    } else if (disableDragOnFocus) {
      el.removeEventListener("focus", onFocus, { capture: true });
      el.removeEventListener("blur", onBlur, { capture: true });
    }

    el.removeAttribute("data-puck-overlay-portal");
  };
};
