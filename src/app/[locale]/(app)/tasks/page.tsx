import { setRequestLocale } from "next-intl/server";
import { TasksView } from "@/components/jobs/TasksView";
import { listJobsAction } from "@/server/actions/jobs";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const initialJobs = await listJobsAction();
  return <TasksView initialJobs={initialJobs} />;
}
