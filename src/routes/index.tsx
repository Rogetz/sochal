import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSochal, sochal } from "@/lib/sochal-store";
import { WalletButton } from "@/components/sochal/WalletButton";
import { Mic, Users, Zap, Trophy, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sochal — Skill-based live battles on Solana" },
      { name: "description", content: "Live talent battles with instant on-chain payouts. Skill-based matchmaking, dynamic prize pools, top fans earn." },
      { property: "og:title", content: "Sochal — Live battles on Solana" },
      { property: "og:description", content: "Talent earns instantly. Skill matches skill. Decentralized payouts." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { wallet, role } = useSochal();
  const navigate = useNavigate();

  useEffect(() => {
    if (wallet && role) navigate({ to: role === "creator" ? "/creator" : "/fan" });
  }, [wallet, role, navigate]);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-glow pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 md:px-8 pt-16 md:pt-28 pb-20 relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6 animate-rise">
            <Sparkles className="size-3" /> Built on Solana · 400ms finality
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] animate-rise">
            Live battles where <br />
            <span className="text-gradient">talent earns instantly.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground animate-rise">
            Sochal is a Solana dApp for skill-based, bracketed live challenges. Fans tip in real time,
            creators are matched by earnings, and every pot pays out on-chain — the second it ends.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 animate-rise">
            {!wallet ? (
              <WalletButton />
            ) : (
              <Link to={role === "creator" ? "/creator" : role === "fan" ? "/fan" : "/"}>
                <Button className="bg-gradient-primary shadow-glow font-semibold">
                  Enter app <ArrowRight className="size-4" />
                </Button>
              </Link>
            )}
            <Link to="/explore">
              <Button variant="outline" className="border-border bg-surface/50">
                Explore live <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { k: "85%", v: "to creator" },
              { k: "5%", v: "top tipper cut" },
              { k: "0.01", v: "SOL min entry" },
              { k: "<400ms", v: "settlement" },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4 hover:border-primary/40 transition"
              >
                <div className="text-2xl md:text-3xl font-bold text-gradient">{s.k}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role chooser */}
      <section className="mx-auto max-w-6xl px-4 md:px-8 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">Pick your side of the stage</h2>
          <p className="text-muted-foreground mt-2">Connect a wallet, then choose how you play.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <RoleCard
            kind="creator"
            icon={<Mic className="size-6" />}
            title="I'm a Creator"
            blurb="Go live, set your tip menu, climb the bracket. Win the title pool — paid atomically on-chain."
            features={["Go-Live studio", "Tip menu builder", "Bracket dashboard", "Instant SOL payouts"]}
          />
          <RoleCard
            kind="fan"
            icon={<Users className="size-6" />}
            title="I'm a Fan"
            blurb="Scroll live reels, tip your favorite, become top fan and earn 5% of every pot you back."
            features={["Live reel feed", "0.01 SOL entry", "Top-tipper rewards", "Live tip menu"]}
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 md:px-8 pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Three stages. One title.</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: <Zap className="size-5" />, n: "01", t: "Live Stage", b: "Hit the dynamic SOL target. 85/5/10 split, instant. Overtime extends 15 min." },
            { icon: <Users className="size-5" />, n: "02", t: "Bracket", b: "Earnings-based matchmaking pairs you with the closest creator. 16 pairs, single elim." },
            { icon: <Trophy className="size-5" />, n: "03", t: "Title Finale", b: "Final pair clears 100+ SOL. Winner takes 70% of the rolled pool. Atomic payout." },
          ].map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-border bg-gradient-surface p-6 hover:border-primary/40 transition group"
            >
              <div className="text-xs font-mono text-primary/70 mb-3">{s.n}</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="size-9 grid place-items-center rounded-lg bg-primary/15 text-primary group-hover:shadow-glow transition">
                  {s.icon}
                </div>
                <div className="font-semibold text-lg">{s.t}</div>
              </div>
              <p className="text-sm text-muted-foreground">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
       © 2026 Sochal. All rights reserved.
      </footer>
    </main>
  );
}

function RoleCard({
  kind,
  icon,
  title,
  blurb,
  features,
}: {
  kind: "creator" | "fan";
  icon: React.ReactNode;
  title: string;
  blurb: string;
  features: string[];
}) {
  const { wallet } = useSochal();
  const navigate = useNavigate();

  const choose = async () => {
    if (!wallet) {
      // The WalletButton dialog is the connect path; nudge them visually.
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    sochal.setRole(kind);
    navigate({ to: kind === "creator" ? "/creator" : "/fan" });
  };

  return (
    <div className="group relative rounded-3xl border border-border bg-gradient-surface p-6 md:p-8 hover:border-primary/50 transition overflow-hidden">
      <div className="absolute -top-20 -right-20 size-60 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition" />
      <div className="relative">
        <div className="size-12 grid place-items-center rounded-xl bg-primary/15 text-primary shadow-glow">
          {icon}
        </div>
        <h3 className="mt-4 text-2xl font-bold">{title}</h3>
        <p className="mt-2 text-muted-foreground">{blurb}</p>

        <ul className="mt-5 grid grid-cols-2 gap-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <span className="size-1.5 rounded-full bg-primary" />
              {f}
            </li>
          ))}
        </ul>

        <Button
          onClick={choose}
          className="mt-6 w-full bg-gradient-primary shadow-glow font-semibold"
          disabled={!wallet}
        >
          {wallet ? `Continue as ${kind}` : "Connect wallet first"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
