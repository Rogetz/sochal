import { useEffect, useState } from "react";
import { Wallet, LogOut, Copy, Check, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  sochal,
  useSochal,
  shortAddr,
  isWalletInstalled,
  WALLET_INSTALL_URL,
  type WalletProvider,
} from "@/lib/sochal-store";
import { ProfileSetupDialog } from "./ProfileSetupDialog";

const providers: { name: WalletProvider; tag: string; color: string }[] = [
  { name: "Phantom", tag: "Most popular", color: "from-[oklch(0.55_0.22_290)] to-[oklch(0.45_0.20_280)]" },
  { name: "Backpack", tag: "xNFT-ready", color: "from-[oklch(0.55_0.20_15)] to-[oklch(0.45_0.18_25)]" },
  { name: "Solflare", tag: "Mobile-friendly", color: "from-[oklch(0.62_0.22_55)] to-[oklch(0.50_0.22_30)]" },
];

export function WalletButton() {
  const { wallet, profile } = useSochal();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Record<WalletProvider, boolean>>({
    Phantom: false, Backpack: false, Solflare: false,
  });
  const [pending, setPending] = useState<WalletProvider | null>(null);

  useEffect(() => {
    setInstalled({
      Phantom: isWalletInstalled("Phantom"),
      Backpack: isWalletInstalled("Backpack"),
      Solflare: isWalletInstalled("Solflare"),
    });
  }, [open]);

  // Once a wallet connects, prompt profile creation if none exists.
  useEffect(() => {
    if (wallet && !profile) setProfileOpen(true);
  }, [wallet, profile]);

  const handleConnect = async (p: WalletProvider) => {
    setError(null);
    setPending(p);
    try {
      await sochal.connect(p);
      setOpen(false);
    } catch (e: any) {
      if (e?.code === 4001 || /reject/i.test(e?.message ?? "")) {
        setError("Connection request was rejected.");
      } else {
        setError(e?.message ?? "Failed to connect");
      }
    } finally {
      setPending(null);
    }
  };

  if (!wallet) {
    return (
      <>
        <Button onClick={() => setOpen(true)} className="bg-gradient-primary shadow-glow font-medium">
          <Wallet className="size-4" />
          Connect Wallet
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl">Connect to Sochal</DialogTitle>
              <DialogDescription>
                Connect any Solana wallet you already own. Sochal never holds your keys — every payout settles on-chain to your address.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-3 mt-2">
              {providers.map((p) => {
                const hasInstalled = installed[p.name];
                return (
                  <button
                    key={p.name}
                    disabled={pending !== null}
                    onClick={() => {
                      if (hasInstalled) {
                        // Directly connect if wallet is installed
                        handleConnect(p.name);
                      } else {
                        // Only open install page if NOT installed
                        window.open(WALLET_INSTALL_URL[p.name], "_blank", "noopener");
                      }
                    }}
                    className={`group relative overflow-hidden rounded-xl bg-gradient-to-r ${p.color} p-[1px] transition-transform hover:scale-[1.01] disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between rounded-[11px] bg-surface px-4 py-4">
                      <div className="text-left">
                        <div className="font-semibold flex items-center gap-2">
                          {p.name}
                          {hasInstalled ? (
                            <span className="text-[10px] font-medium text-success rounded-full bg-success/10 px-2 py-0.5">
                              Installed
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground rounded-full bg-surface-elevated px-2 py-0.5">
                              Not installed
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{p.tag}</div>
                      </div>
                      <span className="text-xs text-primary inline-flex items-center gap-1">
                        {pending === p.name
                          ? "Connecting…"
                          : hasInstalled
                          ? "Connect →"
                          : <>Install <ExternalLink className="size-3" /></>}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              By connecting you agree to sign on-chain transactions for tips, entries and payouts.
            </p>
          </DialogContent>
        </Dialog>

        <ProfileSetupDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-primary/40 bg-surface/50 font-mono text-xs">
            <span className="mr-2 size-2 rounded-full bg-success animate-pulse-glow" />
            {profile ? `@${profile.handle}` : shortAddr(wallet.address)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-popover">
          <div className="px-2 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {wallet.provider}{profile && ` · @${profile.handle}`}
            </div>
            <div className="font-mono text-xs break-all">{wallet.address}</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            {profile ? "Edit profile" : "Create profile"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(wallet.address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy address"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => sochal.disconnect()} className="text-destructive">
            <LogOut className="size-4" /> Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileSetupDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}