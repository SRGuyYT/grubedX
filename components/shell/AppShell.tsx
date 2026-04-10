import type { ReactNode } from "react";

import { Footer } from "@/components/shell/Footer";
import { Navbar } from "@/components/shell/Navbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="grain min-h-screen overflow-x-hidden">
      <Navbar />
      <div className="pb-[calc(5.9rem+env(safe-area-inset-bottom))] pt-[calc(5.2rem+env(safe-area-inset-top))] md:pb-12 md:pl-24 md:pt-8 xl:pl-80">
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
