"use client";

import { DropdownMenu as Primitive, Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;

export function DropdownMenuContent({ className, align = "end", ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-48 rounded-lg border border-line bg-white p-1 shadow-lg data-[state=open]:animate-fade-in", className)}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-charcoal outline-none select-none data-[highlighted]:bg-ivory data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className={cn("px-2.5 py-1.5 text-xs text-muted", className)} {...props} />;
}

export const DropdownMenuSeparator = () => <Primitive.Separator className="my-1 h-px bg-line" />;

export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex flex-wrap gap-1 rounded-lg bg-ivory-deep p-1", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-charcoal focus-visible:ring-3 focus-visible:ring-gold/50 focus-visible:outline-none data-[state=active]:bg-white data-[state=active]:text-forest data-[state=active]:shadow-xs",
        className,
      )}
      {...props}
    />
  );
}
export const TabsContent = TabsPrimitive.Content;
