function applyStyles<K extends keyof NonFunctionProperties<CSSStyleDeclaration>>(
  el: HTMLElement,
  styles: Pick<NonFunctionProperties<CSSStyleDeclaration>, K>
) {
  Object.assign(el.style, styles)
}
