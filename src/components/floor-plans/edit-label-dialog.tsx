"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface EditLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Current text when editing an existing label, or `null` for "add".
   * `null` also resets the input when the dialog re-opens for a new
   * label.
   */
  initialText: string | null;
  onSave: (text: string) => void;
}

export function EditLabelDialog({
  open,
  onOpenChange,
  initialText,
  onSave,
}: EditLabelDialogProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) setText(initialText ?? "");
  }, [open, initialText]);

  const isEdit = initialText !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit label" : "Add label"}</DialogTitle>
          <DialogDescription>
            Useful for doorways, entrances, bar, registration desk, etc.
            Labels can be rotated 90° at a time from the sidebar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="label-text" className="text-xs">
            Text
          </Label>
          <Input
            id="label-text"
            placeholder="Main entrance"
            value={text}
            maxLength={40}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="ghost">Cancel</Button>}
          />
          <Button
            type="button"
            disabled={text.trim().length === 0}
            onClick={() => {
              onSave(text.trim());
              onOpenChange(false);
            }}
          >
            {isEdit ? "Save label" : "Add label"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
