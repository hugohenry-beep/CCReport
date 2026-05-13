import * as React from "react";
import { cn } from "@/lib/cn";

interface ChartCardProps {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, className, children }: ChartCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4 shadow-soft", className)}>
      {(title || description) && (
        <div className="mb-3">
          {title && <h4 className="font-display text-sm font-semibold text-text">{title}</h4>}
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
