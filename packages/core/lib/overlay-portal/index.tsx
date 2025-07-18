import "./styles.css";

// TODO prevent drag
export const registerOverlayPortal = (el: HTMLElement | null | undefined) => {
  if (!el) return;

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  el.addEventListener("mouseover", stopPropagation, {
    capture: true,
  });

  el.setAttribute("data-puck-overlay-portal", "true");

  return () => {
    el.removeEventListener("mouseover", stopPropagation, {
      capture: true,
    });

    el.removeAttribute("data-puck-overlay-portal");
  };
};
