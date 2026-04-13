"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  confirmPayment,
  revokeApplication,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ApplicantEntry {
  id: string;
  profileId: string;
  displayName: string;
  status: string;
  paymentConfirmed: boolean;
  createdAt: Date;
  isAllowListed: boolean;
  isBlockListed: boolean;
}

interface ApplicantListProps {
  eventId: string;
  eventStatus: string;
  applicants: ApplicantEntry[];
}

const DECISION_BADGES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  submitted: { label: "Undecided", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  revoked: { label: "Revoked", variant: "destructive" },
};

export function ApplicantList({
  eventId,
  eventStatus,
  applicants,
}: ApplicantListProps) {
  const [isPending, startTransition] = useTransition();
  const isPublished = eventStatus === "results_published";

  function handleConfirmPayment(applicationId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("applicationId", applicationId);
      formData.set("eventId", eventId);
      await confirmPayment({}, formData);
    });
  }

  function handleRevoke(applicationId: string) {
    const message = prompt("Reason for revoking (optional):");
    if (message === null) return; // User cancelled

    startTransition(async () => {
      const formData = new FormData();
      formData.set("applicationId", applicationId);
      formData.set("eventId", eventId);
      formData.set("message", message);
      await revokeApplication({}, formData);
    });
  }

  if (applicants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No applications received yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {applicants.map((app) => {
        const decisionInfo = DECISION_BADGES[app.status] ?? {
          label: app.status,
          variant: "secondary" as const,
        };

        return (
          <Link
            key={app.id}
            href={`/conventions/manage/events/${eventId}/applications/${app.id}`}
            className="block"
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {app.displayName}
                    </CardTitle>
                    {app.isAllowListed && (
                      <Badge variant="outline" className="text-xs">
                        Allow
                      </Badge>
                    )}
                    {app.isBlockListed && (
                      <Badge variant="destructive" className="text-xs">
                        Block
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={decisionInfo.variant}>
                      {decisionInfo.label}
                    </Badge>
                    {isPublished && app.status === "accepted" && (
                      <Badge
                        variant={
                          app.paymentConfirmed ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {app.paymentConfirmed ? "Paid" : "Unpaid"}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied {app.createdAt.toISOString().slice(0, 10)}
                </p>
              </CardHeader>
              {isPublished && app.status === "accepted" && (
                <CardContent className="flex gap-2 pt-0" onClick={(e) => e.preventDefault()}>
                  <Button
                    size="xs"
                    variant={app.paymentConfirmed ? "outline" : "default"}
                    disabled={isPending}
                    onClick={() => handleConfirmPayment(app.id)}
                  >
                    {app.paymentConfirmed
                      ? "Mark Unpaid"
                      : "Mark Paid"}
                  </Button>
                  <Button
                    size="xs"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => handleRevoke(app.id)}
                  >
                    Revoke
                  </Button>
                </CardContent>
              )}
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
