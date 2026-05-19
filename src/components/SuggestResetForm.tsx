"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Image01Icon } from "@hugeicons/core-free-icons";
import { suggestReset } from "@/lib/actions/submissions";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/date";
import type { GymWithSections } from "@/lib/types";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

type Props = {
  gyms: GymWithSections[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SuggestResetForm({ gyms, open, onOpenChange }: Props) {
  const [state, formAction, isPending] = useActionState(suggestReset, null);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const today = todayISO();

  const selectedGym = useMemo(
    () => gyms.find((g) => g.id === selectedGymId),
    [gyms, selectedGymId],
  );
  const sortedSections = useMemo(
    () =>
      selectedGym
        ? [...selectedGym.sections].sort((a, b) => a.display_order - b.display_order)
        : [],
    [selectedGym],
  );

  const isCountMode = selectedGym?.freshness_mode === "count";
  const wasSuccess = state !== null && "success" in state;

  useEffect(() => {
    if (wasSuccess) {
      const t = setTimeout(() => {
        onOpenChange(false);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [wasSuccess, onOpenChange]);

  const previewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile],
  );
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleGymChange = (id: string) => {
    setSelectedGymId(id);
    setSelectedSectionId("");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Pick an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo is too big (max 4 MB).");
      return;
    }
    setPhotoError(null);
    setPhotoFile(file);
  };

  const resetPhoto = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPhotoFile(null);
    setPhotoError(null);
  };

  useEffect(() => {
    if (open && fileInputRef.current) fileInputRef.current.value = "";
  }, [open]);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedGymId("");
      setSelectedSectionId("");
      setPhotoFile(null);
      setPhotoError(null);
    }
  }

  const formBody = (
    <form action={formAction} className="flex flex-col gap-4 px-4 pb-4 pt-2">
      <FormAlert state={state} successMessage="Thanks — your suggestion is in the review queue." />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_gym_id">Gym</Label>
        <Select value={selectedGymId} onValueChange={handleGymChange}>
          <SelectTrigger id="suggest_gym_id">
            <SelectValue placeholder="Select a gym…" />
          </SelectTrigger>
          <SelectContent>
            {gyms.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="gym_id" value={selectedGymId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_section_id">Sector</Label>
        <Select
          value={selectedSectionId}
          onValueChange={setSelectedSectionId}
          disabled={!selectedGym}
        >
          <SelectTrigger id="suggest_section_id">
            <SelectValue placeholder={selectedGym ? "Select a sector…" : "Pick a gym first"} />
          </SelectTrigger>
          <SelectContent>
            {sortedSections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="section_id" value={selectedSectionId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_reset_on">Reset date</Label>
        <Input
          id="suggest_reset_on"
          name="reset_on"
          type="date"
          required
          max={today}
          defaultValue={today}
        />
      </div>

      {isCountMode && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="suggest_boulders_reset">New boulders</Label>
          <Input
            id="suggest_boulders_reset"
            name="boulders_reset"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            placeholder="e.g. 25"
          />
          <p className="text-xs text-muted-foreground">
            How many new boulders did this reset add?
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_notes">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="suggest_notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="e.g. Whole sector restripped, ~25 new problems"
          className="resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_photo">
          Photo <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <input
          ref={fileInputRef}
          id="suggest_photo"
          name="photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handlePhotoChange}
        />
        {previewUrl ? (
          <div className="flex items-start gap-3 rounded-md border border-foreground/15 bg-muted/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected reset photo"
              className="size-16 rounded object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Ready to send</span>
              <button
                type="button"
                onClick={resetPhoto}
                disabled={isPending}
                className="inline-flex w-fit items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-fit"
          >
            <HugeiconsIcon icon={Image01Icon} className="size-3.5" />
            Add photo
          </Button>
        )}
        {photoError && <p className="text-xs text-destructive">{photoError}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending || wasSuccess}>
          {isPending ? (photoFile ? "Uploading…" : "Sending…") : "Send suggestion"}
        </Button>
      </div>
    </form>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent desktopClassName="w-[min(92vw,460px)] p-0">
        <ResponsiveDialogHeader desktopClassName="px-4 pb-2 pt-4">
          <ResponsiveDialogTitle>Suggest a reset</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Spotted fresh climbing? An admin will review and merge it into the public
            freshness data.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {formBody}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
