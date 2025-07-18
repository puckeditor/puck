import "./styles.css";

export const registerOverlayPortal = (
  el: HTMLElement | null | undefined,
  opts: { disableDrag?: boolean } = {}
) => {
  if (!el) return;

  const { disableDrag = true } = opts;

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  el.addEventListener("mouseover", stopPropagation, {
    capture: true,
  });

  // Disables dnd PointerSensor
  if (disableDrag) {
    el.addEventListener("pointerdown", stopPropagation, {
      capture: true,
    });
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
    }

    el.removeAttribute("data-puck-overlay-portal");
  };
};
