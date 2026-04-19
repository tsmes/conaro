"use client";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BulkBarProps {
  count: number;
  onAccept: () => void;
  onReject: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function BulkBar({
  count,
  onAccept,
  onReject,
  onClear,
  disabled,
}: BulkBarProps) {
  if (count === 0) return null;
  return (
    <div className="sticky top-4 z-30">
      <Card className="flex flex-wrap items-center gap-3 border-primary/25 bg-primary-container p-3 shadow-gallery">
        <span className="text-[13px] font-semibold text-on-primary-container">
          {count} selected
        </span>
        <div className="flex-1" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={disabled}
        >
          <X className="size-3" />
          Reject all
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onAccept}
          disabled={disabled}
        >
          <Check className="size-3" />
          Accept all
        </Button>
        <button
          type="button"
          onClick={onClear}
          className="text-[12px] text-muted-foreground underline hover:text-foreground"
        >
          clear
        </button>
      </Card>
    </div>
  );
}
