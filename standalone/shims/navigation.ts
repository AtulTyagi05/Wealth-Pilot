"use client";
import { useSyncExternalStore } from "react";

/**
 * Hash-based stand-ins for next/navigation in the single-file build.
 * Routes map to plain hash names: "/" <-> "#dashboard", "/planner" <-> "#planner".
 */
export const toHash = (href: string) => {
  const name = href.replace(/^\/+/, "").split(/[?#]/)[0];
  return `#${name || "dashboard"}`;
};

const currentPath = () => {
  const name = (typeof location !== "undefined" ? location.hash : "").replace(/^#/, "");
  return !name || name === "dashboard" ? "/" : `/${name}`;
};

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function usePathname() {
  return useSyncExternalStore(subscribe, currentPath, () => "/");
}

export function navigate(href: string) {
  const hash = toHash(href);
  if (location.hash !== hash) location.hash = hash;
  window.scrollTo({ top: 0 });
}

export function useRouter() {
  return { push: navigate, replace: navigate, back: () => history.back(), refresh: () => {}, prefetch: () => {} };
}
