"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Lets a detail page register a human-readable label for its dynamic route
// segment (e.g. a campaign name) so the Header breadcrumb shows that name
// instead of the raw cuid. The provider wraps both the Header and the page
// children so the page-set label is visible to the Header.
type BreadcrumbContextValue = {
  label: string | null;
  setLabel: (label: string | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  label: null,
  setLabel: () => {},
});

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [label, setLabel] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ label, setLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/** Read the current detail-page breadcrumb label (Header consumes this). */
export function useBreadcrumbLabel(): string | null {
  return useContext(BreadcrumbContext).label;
}

/**
 * Rendered by a server detail page to register its human-readable breadcrumb
 * label. Renders nothing; clears the label on unmount/navigation.
 */
export function SetBreadcrumbLabel({ label }: { label: string }) {
  const { setLabel } = useContext(BreadcrumbContext);
  useEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);
  return null;
}
