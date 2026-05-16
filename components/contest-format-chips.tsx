const LABELS_BY_FORMAT: Record<string, string[]> = {
  weekly_pick_5: ["Weekly", "Pick 5", "NIFTY 50"],
};

interface Props {
  format: string;
  size?: "sm" | "md";
}

export function ContestFormatChips({ format, size = "md" }: Props) {
  const labels = LABELS_BY_FORMAT[format] ?? [format];
  const chipClass =
    size === "sm"
      ? "text-[10px] px-2 py-0.5"
      : "text-xs px-2.5 py-1";
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((l) => (
        <span
          key={l}
          className={`${chipClass} text-zinc-300 border border-zinc-800 rounded-full whitespace-nowrap`}
        >
          {l}
        </span>
      ))}
    </div>
  );
}
