"use client";

import { useCallback, useTransition } from "react";
import { ArtistSearchDialog } from "./artist-search-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  addToList,
  removeFromList,
} from "@/app/conventions/manage/lists/actions";

interface ListEntry {
  id: string;
  profileId: string;
  displayName: string;
  contactEmail: string | null;
}

interface ArtistListManagerProps {
  allowList: ListEntry[];
  blockList: ListEntry[];
}

export function ArtistListManager({
  allowList: initialAllow,
  blockList: initialBlock,
}: ArtistListManagerProps) {
  const [isPending, startTransition] = useTransition();

  const allProfileIds = new Set([
    ...initialAllow.map((e) => e.profileId),
    ...initialBlock.map((e) => e.profileId),
  ]);

  const handleAdd = useCallback(
    (profileId: string, listType: "allow" | "block") => {
      startTransition(async () => {
        const formData = new FormData();
        formData.set("profileId", profileId);
        formData.set("listType", listType);
        await addToList({}, formData);
      });
    },
    []
  );

  const handleRemove = useCallback((profileId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("profileId", profileId);
      await removeFromList({}, formData);
    });
  }, []);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Allow List</CardTitle>
          <ArtistSearchDialog
            listType="allow"
            existingProfileIds={allProfileIds}
            onAdd={handleAdd}
          />
        </CardHeader>
        <CardContent>
          {initialAllow.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No artists on the allow list.
            </p>
          ) : (
            <div className="space-y-2">
              {initialAllow.map((entry) => (
                <div
                  key={entry.profileId}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {entry.displayName}
                    </p>
                    {entry.contactEmail && (
                      <p className="text-xs text-muted-foreground">
                        {entry.contactEmail}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleRemove(entry.profileId)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Block List</CardTitle>
          <ArtistSearchDialog
            listType="block"
            existingProfileIds={allProfileIds}
            onAdd={handleAdd}
          />
        </CardHeader>
        <CardContent>
          {initialBlock.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No artists on the block list.
            </p>
          ) : (
            <div className="space-y-2">
              {initialBlock.map((entry) => (
                <div
                  key={entry.profileId}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {entry.displayName}
                    </p>
                    {entry.contactEmail && (
                      <p className="text-xs text-muted-foreground">
                        {entry.contactEmail}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleRemove(entry.profileId)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
