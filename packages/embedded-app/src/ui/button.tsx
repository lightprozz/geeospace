import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

// shadcn/ui Button composition; SpaceOS owns the semantic-token styling.
const buttonVariants = cva("ui-button", {
  variants: {
    variant: { default: "ui-button-primary", outline: "ui-button-outline", ghost: "ui-button-ghost", secondary: "ui-button-secondary" },
    size: { default: "ui-button-default", icon: "ui-button-icon" },
  },
  defaultVariants: { variant: "outline", size: "default" },
});
export function Button({ className, variant, size, asChild = false, type = "button", ...props }:
  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component data-slot="button" type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
