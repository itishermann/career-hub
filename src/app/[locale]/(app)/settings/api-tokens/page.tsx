import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Settings was consolidated into a single tabbed page (design: side-tabs +
// content pane). This sub-route is kept as a redirect so old links/bookmarks
// still resolve.
export default async function RedirectToSettings({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/settings`);
}
