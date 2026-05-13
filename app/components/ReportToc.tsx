"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface ReportTocProps {
  sections: { id: string; title: string }[];
}

export default function ReportToc({ sections }: ReportTocProps) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (typeof window === "undefined" || sections.length === 0) return;
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el != null);
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: [0, 1] },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <>
      {/* Desktop: sticky left rail */}
      <nav
        aria-label="Sections"
        className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-4"
      >
        <p className="text-[0.7rem] font-medium uppercase tracking-wider text-text-subtle mb-2 px-2">
          On this page
        </p>
        <ul className="space-y-0.5 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text",
                  active === s.id && "bg-accent-soft text-accent font-medium",
                )}
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile/tablet: horizontal chip strip */}
      <nav
        aria-label="Sections"
        className="lg:hidden -mx-4 sm:mx-0 overflow-x-auto no-scrollbar"
      >
        <ul className="flex gap-1.5 px-4 sm:px-0 py-1 whitespace-nowrap">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  "inline-block rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active === s.id
                    ? "border-accent bg-accent-soft text-accent font-medium"
                    : "border-border bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text",
                )}
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
