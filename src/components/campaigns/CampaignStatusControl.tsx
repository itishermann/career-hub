"use client";

import { Badge, Menu } from "@mantine/core";
import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { updateCampaign } from "@/server/actions/campaigns";

const STATUSES = [
  "DRAFT",
  "SENT",
  "RESPONDED",
  "INTERVIEWING",
  "REJECTED",
  "ACCEPTED",
  "WITHDRAWN",
] as const;
type Status = (typeof STATUSES)[number];

const COLOR: Record<Status, string> = {
  DRAFT: "gray",
  SENT: "blue",
  RESPONDED: "blue",
  INTERVIEWING: "magenta",
  REJECTED: "red",
  ACCEPTED: "green",
  WITHDRAWN: "gray",
};

export function CampaignStatusControl({
  campaignId,
  initial,
}: {
  campaignId: string;
  initial: Status;
}) {
  const t = useTranslations("campaign.statusValues");
  const [status, setStatus] = useState<Status>(initial);
  const [pending, startTransition] = useTransition();

  function choose(next: Status) {
    if (next === status) return;
    setStatus(next);
    startTransition(async () => {
      await updateCampaign({ id: campaignId, status: next });
    });
  }

  return (
    <Menu shadow="md" width={210} position="bottom-start">
      <Menu.Target>
        <Badge
          component="button"
          type="button"
          variant="light"
          color={COLOR[status]}
          size="lg"
          rightSection={<ChevronDown size={12} />}
          style={{ cursor: "pointer", opacity: pending ? 0.6 : 1 }}
        >
          {t(status)}
        </Badge>
      </Menu.Target>
      <Menu.Dropdown>
        {STATUSES.map((s) => (
          <Menu.Item
            key={s}
            onClick={() => choose(s)}
            leftSection={
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: `var(--mantine-color-${COLOR[s]}-6)`,
                  display: "inline-block",
                }}
              />
            }
            rightSection={
              s === status ? (
                <Check size={13} color="var(--ch-accent-2)" />
              ) : null
            }
          >
            {t(s)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
