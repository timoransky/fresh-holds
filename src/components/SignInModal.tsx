"use client";

import { useRouter } from "next/navigation";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { SignInPanel } from "@/components/SignInPanel";

type Props = {
  next: string;
};

export function SignInModal({ next }: Props) {
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    if (!open) router.back();
  };

  return (
    <ResponsiveDialog open onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent
        desktopClassName="w-full max-w-sm p-6"
        mobileClassName="px-6 pt-4 pb-8"
      >
        <ResponsiveDialogHeader srOnly>
          <ResponsiveDialogTitle>Sign in</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <SignInPanel next={next} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
