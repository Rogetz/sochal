import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Zap, Mic, Music, Flame, Crown } from "lucide-react";
import { SolAmount } from "./SolAmount";
import type { Reel } from "./ReelCard";
// import { sochal } from "@/lib/sochal-store"; // for wallet on real tx

const actions = [
  { icon: Mic, label: "Shoutout my name", sol: 0.05 },
  { icon: Music, label: "Sing my request", sol: 0.25 },
  { icon: Flame, label: "Roast challenge", sol: 0.5 },
  { icon: Crown, label: "Crown me top fan", sol: 1.0 },
];

export function TipMenu({
  open,
  onOpenChange,
  reel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reel: Reel;
}) {
  const [custom, setCustom] = useState("0.10");
  const [pending, setPending] = useState<string | null>(null);

  // TODO: wire to Anchor `tip` instruction on Solana with wallet adapter.
  const sendTip = async (label: string, sol: number) => {
    setPending(label);
    await new Promise((r) => setTimeout(r, 900));
    setPending(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-card border-border rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Tip Menu · {reel.creator}</SheetTitle>
          <SheetDescription>
            Pay SOL to request an action. 85% creator · 5% top tipper · 10% protocol — instant on-chain.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-2 mt-4">
          {actions.map((a) => (
            <button
              key={a.label}
              disabled={!!pending}
              onClick={() => sendTip(a.label, a.sol)}
              className="group flex items-center justify-between rounded-2xl border border-border bg-surface hover:bg-surface-elevated hover:border-primary/50 transition px-4 py-3 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 grid place-items-center rounded-xl bg-primary/15 text-primary">
                  <a.icon className="size-5" />
                </div>
                <span className="font-medium text-left">{a.label}</span>
              </div>
              <span className="font-mono text-sm">
                {pending === a.label ? "Signing…" : <SolAmount value={a.sol} />}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground mb-2">Custom tip</div>
          <div className="flex gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              inputMode="decimal"
              className="flex-1 bg-input rounded-xl px-3 py-2 font-mono text-sm border border-border focus:border-primary outline-none"
            />
            <Button
              disabled={!!pending}
              onClick={() => sendTip("Custom", parseFloat(custom) || 0)}
              className="bg-gradient-primary shadow-glow"
            >
              <Zap className="size-4" /> Send
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
