"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ActionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
  mobileBreakpoint?: number;
  contentClassName?: string;
};

export function ActionModal({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  mobileBreakpoint = 768,
  contentClassName,
}: ActionModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = `(max-width: ${mobileBreakpoint - 1}px)`;
    const media = window.matchMedia(query);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [mobileBreakpoint]);

  const body = useMemo(
    () => (
      <div className={cn("max-h-[72dvh] overflow-y-auto pr-1 scrollbar-hide", contentClassName)}>
        {children}
      </div>
    ),
    [children, contentClassName]
  );

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
        {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] max-h-[92dvh] rounded-t-[2rem] border-t border-slate-100 bg-white shadow-[0_-18px_40px_-25px_rgba(15,23,42,0.35)] outline-none">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-4">
              <Drawer.Title className="text-lg font-semibold text-slate-900">{title}</Drawer.Title>
              {description ? (
                <Drawer.Description className="mt-1 text-sm text-slate-500">
                  {description}
                </Drawer.Description>
              ) : null}
              <div className="mt-4">{body}</div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-xl rounded-3xl border-slate-100 bg-white p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="mt-4">{body}</div>
      </DialogContent>
    </Dialog>
  );
}
