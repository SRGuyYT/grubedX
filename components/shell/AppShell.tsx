import type { ReactNode } from "react";
import { Footer } from "@/components/shell/Footer";
import { Navbar } from "@/components/shell/Navbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="grain min-h-screen overflow-x-hidden">
      <Navbar />
      <div className="app-shell-content pb-10">
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
