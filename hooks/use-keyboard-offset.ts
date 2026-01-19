"use client";

import { useEffect, useRef, useState } from "react";

const isEditableElement = (element: Element | null) => {
  if (!element) return false;
  const tagName = element.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA") return true;
  return element instanceof HTMLElement && element.isContentEditable;
};

export function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  const baselineHeightRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visualViewport = window.visualViewport ?? null;

    const updateBaseline = () => {
      baselineHeightRef.current = window.innerHeight;
    };

    const computeOffset = () => {
      if (!isEditableElement(document.activeElement)) {
        updateBaseline();
        setOffset(0);
        return;
      }

      if (visualViewport) {
        const keyboardHeight = Math.max(
          0,
          window.innerHeight - visualViewport.height - visualViewport.offsetTop
        );
        setOffset(keyboardHeight);
        return;
      }

      if (baselineHeightRef.current === null) {
        updateBaseline();
      }
      const baselineHeight = baselineHeightRef.current ?? window.innerHeight;
      setOffset(Math.max(0, baselineHeight - window.innerHeight));
    };

    computeOffset();

    if (visualViewport) {
      visualViewport.addEventListener("resize", computeOffset);
      visualViewport.addEventListener("scroll", computeOffset);
    }
    window.addEventListener("resize", computeOffset);
    window.addEventListener("focusin", computeOffset);
    window.addEventListener("focusout", computeOffset);

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener("resize", computeOffset);
        visualViewport.removeEventListener("scroll", computeOffset);
      }
      window.removeEventListener("resize", computeOffset);
      window.removeEventListener("focusin", computeOffset);
      window.removeEventListener("focusout", computeOffset);
    };
  }, []);

  return offset;
}
