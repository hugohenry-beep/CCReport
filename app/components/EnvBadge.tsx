import { Badge } from "./ui/Badge";

export function EnvBadge() {
  const env = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV;
  if (!env || env === "production") return null;
  const label =
    env === "development"
      ? "DEV"
      : env === "test"
      ? "TEST"
      : env.toUpperCase().slice(0, 8);
  const variant = env === "development" ? "warning" : "accent";
  return (
    <Badge variant={variant} className="font-mono uppercase">
      {label}
    </Badge>
  );
}
