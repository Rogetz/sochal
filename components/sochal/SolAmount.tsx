export function SolAmount({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1 font-mono ${className}`}>
      <span className="tabular-nums">{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      <span className="text-[0.7em] text-muted-foreground">SOL</span>
    </span>
  );
}
