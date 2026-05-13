import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-fg shadow-soft"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12V6" />
          <path d="M8 12V3" />
          <path d="M13 12V8" />
          <path d="M2 14h12" />
        </svg>
      </span>
      {showWordmark && (
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Inbound Lead Report
        </span>
      )}
    </span>
  );
}
