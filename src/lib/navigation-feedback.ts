const NAVIGATION_START_EVENT = "guantearqueros:navigation-start";
const NAVIGATION_CANCEL_EVENT = "guantearqueros:navigation-cancel";

export function announceNavigationStart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}

/** Una navegación anunciada no ocurrió (p. ej. volver sin página anterior): apaga el loader. */
export function announceNavigationCancel() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAVIGATION_CANCEL_EVENT));
}

export { NAVIGATION_CANCEL_EVENT, NAVIGATION_START_EVENT };
