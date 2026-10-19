"use client";

import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlay = "fixed inset-0 z-50 bg-forest-deep/45 data-[state=open]:animate-fade-in";
const panel =
  "fixed top-1/2 left-1/2 z-50 grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border border-line bg-white p-6 shadow-2xl data-[state=open]:animate-fade-in focus:outline-none";

export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content className={cn(panel, className)} {...props}>
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted hover:bg-ivory hover:text-charcoal focus-visible:ring-3 focus-visible:ring-gold/50 focus-visible:outline-none">
          <X className="size-4" aria-hidden />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="space-y-1 pr-6">
      <DialogPrimitive.Title className="font-display text-lg font-bold text-forest">{title}</DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="text-sm text-muted">{description}</DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">Dialog</DialogPrimitive.Description>
      )}
    </div>
  );
}

/** Accessible confirmation dialog (focus-trapped; Escape cancels). */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
  open,
  onOpenChange,
  children,
  disabled,
}: {
  trigger?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertPrimitive.Trigger asChild>{trigger}</AlertPrimitive.Trigger>}
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlay} />
        <AlertPrimitive.Content className={panel}>
          <div className="space-y-1">
            <AlertPrimitive.Title className="font-display text-lg font-bold text-forest">{title}</AlertPrimitive.Title>
            <AlertPrimitive.Description className="text-sm text-muted">{description}</AlertPrimitive.Description>
          </div>
          {children}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertPrimitive.Cancel className={buttonVariants({ variant: "outline" })}>Cancel</AlertPrimitive.Cancel>
            <AlertPrimitive.Action
              disabled={disabled}
              onClick={onConfirm}
              className={buttonVariants({ variant: destructive ? "destructive" : "default" })}
            >
              {confirmLabel}
            </AlertPrimitive.Action>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
