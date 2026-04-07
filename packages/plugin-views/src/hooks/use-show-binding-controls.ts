"use client";

import { useEffect, useState } from "react";

const DESKTOP_FIELDS_QUERY = "(min-width: 638px)";

const shouldHideDesktopDuplicateControls = (element: HTMLElement | null) => {
  if (!element || typeof window === "undefined") {
    return false;
  }

  if (!window.matchMedia(DESKTOP_FIELDS_QUERY).matches) {
    return false;
  }

  return Boolean(element.closest('[class*="FieldsPlugin"]'));
};

export const useShowBindingControls = (element: HTMLElement | null) => {
  const [showBindingControls, setShowBindingControls] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_FIELDS_QUERY);
    const update = () => {
      setShowBindingControls(!shouldHideDesktopDuplicateControls(element));
    };

    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", update);
    } else {
      mediaQuery.addListener(update);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", update);
      } else {
        mediaQuery.removeListener(update);
      }
    };
  }, [element]);

  return showBindingControls;
};
