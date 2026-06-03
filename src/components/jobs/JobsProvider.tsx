"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { JobSummary } from "@/server/jobs/types";

type JobsContextValue = {
  jobs: JobSummary[];
  activeCount: number; // QUEUED + RUNNING
};

const JobsContext = createContext<JobsContextValue>({
  jobs: [],
  activeCount: 0,
});

export function useJobs(): JobsContextValue {
  return useContext(JobsContext);
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const jobsRef = useRef<Map<string, JobSummary>>(new Map());

  useEffect(() => {
    let es: EventSource | null = null;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const apply = () =>
      setJobs(
        [...jobsRef.current.values()].sort((a, b) =>
          b.queuedAt.localeCompare(a.queuedAt),
        ),
      );

    const connect = () => {
      if (stopped) return;
      es = new EventSource("/api/jobs/stream");
      es.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as
          | { type: "snapshot"; jobs: JobSummary[] }
          | { type: "update"; job: JobSummary };
        if (msg.type === "snapshot") {
          jobsRef.current = new Map(msg.jobs.map((j) => [j.id, j]));
        } else {
          jobsRef.current.set(msg.job.id, msg.job);
        }
        apply();
      };
      es.onerror = () => {
        es?.close();
        if (!stopped) retry = setTimeout(connect, 3000);
      };
    };
    connect();

    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, []);

  const value = useMemo<JobsContextValue>(() => {
    const activeCount = jobs.filter(
      (j) => j.status === "QUEUED" || j.status === "RUNNING",
    ).length;
    return { jobs, activeCount };
  }, [jobs]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}
