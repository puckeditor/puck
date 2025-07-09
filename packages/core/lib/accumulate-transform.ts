export function accumulateTransform(el: HTMLElement) {
  let matrix = new DOMMatrixReadOnly();
  let n: HTMLElement | null = el.parentElement;

  while (n && n !== document.documentElement) {
    const t = getComputedStyle(n).transform;
    if (t && t !== "none") {
      matrix = new DOMMatrixReadOnly(t).multiply(matrix);
    }
    n = n.parentElement;
  }

  return { scaleX: matrix.a, scaleY: matrix.d };
}
