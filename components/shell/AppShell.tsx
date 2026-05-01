import type { ReactNode } from "react";

import { Footer } from "@/components/shell/Footer";
import { Navbar } from "@/components/shell/Navbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="grain min-h-screen overflow-x-hidden">
      <Navbar />
      <div className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] md:pb-12 md:pt-[calc(5.5rem+env(safe-area-inset-top))]">
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
