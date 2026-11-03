"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({ className, children, closeLabel, ...props }:
  React.ComponentProps<typeof DialogPrimitive.Content> & { closeLabel: string }) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay data-slot="dialog-overlay" className="ui-dialog-overlay" />
    <DialogPrimitive.Content data-slot="dialog-content" className={cn("ui-dialog-content", className)} {...props}>
      {children}
      <DialogPrimitive.Close className="ui-dialog-close" aria-label={closeLabel}><X size={18} /></DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}
export function DialogTitle(props: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" {...props} />;
}
export function DialogDescription(props: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" {...props} />;
}
