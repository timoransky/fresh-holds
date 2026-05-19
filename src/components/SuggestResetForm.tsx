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
import { createClient } from "@/utils/supabase/client";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

type Props = {
  gyms: GymWithSections[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SuggestResetForm({ gyms, open, onOpenChange }: Props) {
  const [state, formAction, isPending] = useActionState(suggestReset, null);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [photo, setPhoto] = useState<
    | { status: "idle" }
    | { status: "uploading"; previewUrl: string }
    | { status: "ready"; previewUrl: string; path: string }
    | { status: "error"; message: string }
  >({ status: "idle" });
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

  const handleGymChange = (id: string) => {
    setSelectedGymId(id);
    setSelectedSectionId("");
  };

  const photoPreviewUrl =
    photo.status === "uploading" || photo.status === "ready" ? photo.previewUrl : null;
  useEffect(() => {
    if (!photoPreviewUrl) return;
    return () => URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  const resetPhoto = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPhoto({ status: "idle" });
  };

  useEffect(() => {
    if (open && fileInputRef.current) fileInputRef.current.value = "";
  }, [open]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhoto({ status: "error", message: "Pick an image file." });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhoto({ status: "error", message: "Photo is too big (max 8 MB)." });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPhoto({ status: "uploading", previewUrl });

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setPhoto({ status: "error", message: "Sign in to upload a photo." });
      return;
    }

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `submissions/${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("reset-photos")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      setPhoto({ status: "error", message: error.message });
      return;
    }
    setPhoto({ status: "ready", previewUrl, path });
  };

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedGymId("");
      setSelectedSectionId("");
      setPhoto({ status: "idle" });
    }
  }

  const photoPath = photo.status === "ready" ? photo.path : "";
  const isUploadingPhoto = photo.status === "uploading";

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
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handlePhotoChange}
        />
        <input type="hidden" name="photo_path" value={photoPath} />
        {photoPreviewUrl ? (
          <div className="flex items-start gap-3 rounded-md border border-foreground/15 bg-muted/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreviewUrl}
              alt="Selected reset photo"
              className="size-16 rounded object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
              <span className="text-muted-foreground">
                {photo.status === "uploading" ? "Uploading…" : "Ready to send"}
              </span>
              <button
                type="button"
                onClick={resetPhoto}
                disabled={photo.status === "uploading"}
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
        {photo.status === "error" && (
          <p className="text-xs text-destructive">{photo.message}</p>
        )}
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
        <Button
          type="submit"
          size="sm"
          disabled={isPending || wasSuccess || isUploadingPhoto}
        >
          {isPending ? "Sending…" : isUploadingPhoto ? "Uploading photo…" : "Send suggestion"}
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
