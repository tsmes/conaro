"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  displayName: string;
  contactEmail: string | null;
}

interface ArtistSearchDialogProps {
  listType: "allow" | "block";
  existingProfileIds: Set<string>;
  onAdd: (profileId: string, listType: "allow" | "block") => void;
}

export function ArtistSearchDialog({
  listType,
  existingProfileIds,
  onAdd,
}: ArtistSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(
          `/api/artists/search?q=${encodeURIComponent(q)}`
        );
        const data = await response.json();
        setResults(
          (data.results ?? []).filter(
            (r: SearchResult) => !existingProfileIds.has(r.id)
          )
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [existingProfileIds]
  );

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function handleAdd(profileId: string) {
    onAdd(profileId, listType);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Add to {listType === "allow" ? "Allow" : "Block"} List
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add Artist to {listType === "allow" ? "Allow" : "Block"} List
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus
          />

          {searching && (
            <p className="text-sm text-muted-foreground">Searching...</p>
          )}

          {!searching && results.length === 0 && query.length >= 2 && (
            <p className="text-sm text-muted-foreground">No artists found.</p>
          )}

          {results.length > 0 && (
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {results.map((artist) => (
                <div
                  key={artist.id}
                  className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {artist.displayName}
                    </p>
                    {artist.contactEmail && (
                      <p className="text-xs text-muted-foreground">
                        {artist.contactEmail}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAdd(artist.id)}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
