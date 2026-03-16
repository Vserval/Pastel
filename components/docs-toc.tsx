 "use client";

import type { Heading } from "@/lib/markdown";
import { useEffect, useMemo, useState } from "react";

export function DocsToc({
  headings,
  variant = "desktop",
}: {
  headings: Heading[];
  variant?: "desktop" | "mobile";
}) {
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ids.length) return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).offsetTop -
              (b.target as HTMLElement).offsetTop
          );
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      {
        root: null,
        rootMargin: "-30% 0px -60% 0px",
        threshold: [0, 1],
      }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [ids]);

  function TocList() {
    return (
      <ul>
        {headings.map((heading) => {
          const isActive = heading.id === activeId;
          return (
            <li key={heading.id} className={`level-${heading.level}`}>
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => {
                  setActiveId(heading.id);
                  if (variant === "mobile") setMobileOpen(false);
                }}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  if (variant === "mobile") {
    if (!headings.length) return null;
    return (
      <details
        className="toc-mobile-details"
        open={mobileOpen}
        onToggle={(e) =>
          setMobileOpen((e.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary className="toc-mobile-summary">このページの内容</summary>
        <div className="toc toc--mobile">
          <TocList />
        </div>
      </details>
    );
  }

  return (
    <div className="toc">
      <p className="toc-title">このページの内容</p>
      <TocList />
    </div>
  );
}
