"use client";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { navigate, toHash } from "./navigation";

/** Stand-in for next/link: internal routes become hash links. */
const Link = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }>(
  function Link({ href, prefetch: _prefetch, onClick, ...rest }, ref) {
    void _prefetch;
    const internal = href.startsWith("/");
    return (
      <a
        ref={ref}
        href={internal ? toHash(href) : href}
        onClick={(e) => {
          onClick?.(e);
          if (internal && !e.defaultPrevented && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            navigate(href);
          }
        }}
        {...rest}
      />
    );
  },
);

export default Link;
