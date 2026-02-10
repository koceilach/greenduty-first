const GD_ACTIVE_PAGE_EVENT = "gd:active-page";

export const setActivePage = (page: string) => {
  if (typeof window === "undefined") return;
  (window as any).__GD_ACTIVE_PAGE = page;
  window.dispatchEvent(new CustomEvent(GD_ACTIVE_PAGE_EVENT, { detail: page }));
};

export const getActivePage = () => {
  if (typeof window === "undefined") return null;
  return (window as any).__GD_ACTIVE_PAGE ?? null;
};

export const subscribeActivePage = (handler: (page: string) => void) => {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail ?? "";
    handler(detail);
  };
  window.addEventListener(GD_ACTIVE_PAGE_EVENT, listener);
  return () => window.removeEventListener(GD_ACTIVE_PAGE_EVENT, listener);
};
