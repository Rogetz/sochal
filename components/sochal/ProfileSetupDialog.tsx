import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sochal, useSochal } from "@/lib/sochal-store";
import { UserCircle2 } from "lucide-react";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function ProfileSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { wallet, profile } = useSochal();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setHandle(profile?.handle ?? "");
      setDisplayName(profile?.displayName ?? "");
      setBio(profile?.bio ?? "");
      setErr(null);
    }
  }, [open, profile]);

  if (!wallet) return null;

  const submit = () => {
    const h = handle.trim().toLowerCase();
    if (!HANDLE_RE.test(h)) {
      setErr("Handle must be 3–20 chars: lowercase letters, numbers, underscore.");
      return;
    }
    if (!displayName.trim()) {
      setErr("Display name is required.");
      return;
    }
    // TODO: call Anchor `create_profile(handle)` — derive Profile PDA from wallet.
    sochal.saveProfile({
      handle: h,
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      createdAt: profile?.createdAt,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <div className="size-12 grid place-items-center rounded-xl bg-primary/15 text-primary mb-2">
            <UserCircle2 className="size-6" />
          </div>
          <DialogTitle className="text-2xl">
            {profile ? "Edit your profile" : "Create your Sochal profile"}
          </DialogTitle>
          <DialogDescription>
            Pick a unique handle. It's tied to your wallet — fans tip and follow you by it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Handle" hint="3–20 chars · a–z 0–9 _">
            <div className="flex items-center rounded-xl border border-border bg-input focus-within:border-primary">
              <span className="pl-3 pr-1 text-muted-foreground text-sm">@</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                placeholder="yourname"
                className="flex-1 bg-transparent py-2.5 pr-3 text-sm outline-none"
                maxLength={20}
              />
            </div>
          </Field>

          <Field label="Display name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you on stage?"
              className="w-full bg-input rounded-xl px-3 py-2.5 text-sm border border-border focus:border-primary outline-none"
              maxLength={40}
            />
          </Field>

          <Field label="Bio (optional)">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="One line about your craft."
              rows={2}
              className="w-full bg-input rounded-xl px-3 py-2.5 text-sm border border-border focus:border-primary outline-none resize-none"
              maxLength={140}
            />
          </Field>

          {err && <div className="text-xs text-destructive">{err}</div>}

          <Button onClick={submit} className="w-full h-11 bg-gradient-primary shadow-glow font-semibold">
            {profile ? "Save profile" : "Create profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-xs font-medium text-foreground">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
