type Shape = "square" | "pill";

const SHAPE_CLASS: Record<Shape, string> = {
  square: "rounded-sm",
  pill: "rounded-full",
};

export function StatusBadge<T extends string>({
  status,
  styles,
  fallback,
  shape = "square",
  label,
}: {
  status: T;
  styles: Record<T, string>;
  fallback: T;
  shape?: Shape;
  label?: string;
}) {
  const className = styles[status] ?? styles[fallback];
  return (
    <span
      className={`shrink-0 px-2.5 py-0.5 text-xs font-medium ${SHAPE_CLASS[shape]} ${className}`}
    >
      {label ?? status}
    </span>
  );
}
