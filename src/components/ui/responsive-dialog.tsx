"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const ResponsiveDialogContext = React.createContext<boolean | null>(null);

function useIsDesktop(): boolean {
  const ctx = React.use(ResponsiveDialogContext);
  if (ctx === null) {
    throw new Error("ResponsiveDialog.* must be used inside <ResponsiveDialog>");
  }
  return ctx;
}

type RootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function ResponsiveDialog({ children, ...props }: RootProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const Root = isDesktop ? Dialog : Drawer;
  return (
    <ResponsiveDialogContext.Provider value={isDesktop}>
      <Root {...props}>{children}</Root>
    </ResponsiveDialogContext.Provider>
  );
}

function ResponsiveDialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();
  const Trigger = isDesktop ? DialogTrigger : DrawerTrigger;
  return <Trigger asChild={asChild}>{children}</Trigger>;
}

type ContentProps = React.ComponentProps<"div"> & {
  desktopClassName?: string;
  mobileClassName?: string;
};

function ResponsiveDialogContent({
  className,
  desktopClassName,
  mobileClassName,
  children,
  ...props
}: ContentProps) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return (
      <DialogContent className={[className, desktopClassName].filter(Boolean).join(" ")} {...props}>
        {children}
      </DialogContent>
    );
  }
  return (
    <DrawerContent className={[className, mobileClassName].filter(Boolean).join(" ")} {...props}>
      {children}
    </DrawerContent>
  );
}

function ResponsiveDialogHeader({
  className,
  desktopClassName,
  mobileClassName,
  srOnly,
  ...props
}: React.ComponentProps<"div"> & {
  srOnly?: boolean;
  desktopClassName?: string;
  mobileClassName?: string;
}) {
  const isDesktop = useIsDesktop();
  const Header = isDesktop ? DialogHeader : DrawerHeader;
  const breakpointClassName = isDesktop ? desktopClassName : mobileClassName;
  return (
    <Header
      className={[srOnly ? "sr-only" : "", className, breakpointClassName].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

function ResponsiveDialogTitle({
  children,
  className,
  ...props
}: React.ComponentProps<"h2">) {
  const isDesktop = useIsDesktop();
  const Title = isDesktop ? DialogTitle : DrawerTitle;
  const headingClass = "font-heading text-3xl font-extrabold tracking-tight leading-tight";
  return (
    <Title className={[headingClass, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </Title>
  );
}

function ResponsiveDialogDescription({ children, ...props }: React.ComponentProps<"p">) {
  const isDesktop = useIsDesktop();
  const Description = isDesktop ? DialogDescription : DrawerDescription;
  return <Description {...props}>{children}</Description>;
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  useIsDesktop,
};
