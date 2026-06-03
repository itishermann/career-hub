"use client";

import {
  BookOpen,
  Briefcase,
  FileText,
  Folder,
  type LucideProps,
  Plus,
  Sparkles,
} from "lucide-react";

/**
 * Client-side icon registry.
 *
 * lucide-react icons are `forwardRef` objects from a non-"use client" module,
 * so they cannot be passed as props (or as elements) from a Server Component
 * into a Client Component — React can't serialize them across the boundary.
 *
 * Server Components therefore pass a *string* icon name, and this client module
 * resolves it to the actual lucide component. The lucide import stays entirely
 * on the client side.
 */
const CH_ICONS = {
  briefcase: Briefcase,
  "file-text": FileText,
  folder: Folder,
  "book-open": BookOpen,
  plus: Plus,
  sparkles: Sparkles,
} as const;

export type ChIconName = keyof typeof CH_ICONS;

export function ChIcon({ name, ...props }: { name: ChIconName } & LucideProps) {
  const Cmp = CH_ICONS[name];
  return <Cmp {...props} />;
}
