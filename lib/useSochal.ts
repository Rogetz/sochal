"use client";

import { useSyncExternalStore } from "react";
import { sochal } from "./sochal-store";

export function useSochal() {
  return useSyncExternalStore(
    sochal.subscribe,
    () => sochal.get(),
    () => sochal.get()
  );
}