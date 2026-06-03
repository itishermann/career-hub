export type JobContext = {
  jobId: string;
  reportProgress: (step: string, progress: number) => Promise<void>;
  throwIfCancelled: () => Promise<void>;
};

export type JobUser = {
  id: string;
  name: string | null;
  email: string;
  llmConfig: unknown;
};
