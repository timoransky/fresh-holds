"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SignInPanel } from "@/components/SignInPanel";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type Props = {
  next: string;
};

export function SignInModal({ next }: Props) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleOpenChange = (open: boolean) => {
    if (!open) router.back();
  };

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent className="w-full max-w-sm p-6">
          <DialogHeader className="sr-only">
            <DialogTitle>Sign in</DialogTitle>
          </DialogHeader>
          <SignInPanel next={next} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>Sign in</DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pt-4 pb-8">
          <SignInPanel next={next} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
