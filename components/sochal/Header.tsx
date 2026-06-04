"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";
import { useSochal } from "@/lib/sochal-store";
import { Zap, Home, Compass, Radio, User } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { profile } = useSochal();

  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
    },
    {
      href: "/explore",
      label: "Explore",
      icon: Compass,
    },
    {
      href: "/live",
      label: "Live",
      icon: Radio,
    },
    {
      href: "/creator",
      label: "Creator",
      icon: User,
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600">
            <Zap className="size-5 text-white" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-white">Sochal</h1>
            <p className="text-xs text-gray-400">
              Web3 Creator Platform
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {profile && (
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-white">
                {profile.displayName}
              </p>

              <p className="text-xs text-gray-400">
                @{profile.handle}
              </p>
            </div>
          )}

          <WalletButton />
        </div>
      </div>
    </header>
  );
}