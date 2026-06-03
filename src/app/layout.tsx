import type { ReactNode } from "react";
import "./globals.css";

// The actual <html> + <body> live in src/app/[locale]/layout.tsx because the
// language attribute must reflect the active locale. This root layout is a
// pass-through required by Next.js.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
