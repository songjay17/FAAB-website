import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommissionerActionCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  variant = "default",
  onAction,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  variant?: "default" | "destructive";
  onAction?: () => void;
  children?: ReactNode;
}) {
  const [showPreviewNotice, setShowPreviewNotice] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    if (onAction) {
      onAction();
      return;
    }
    setShowPreviewNotice(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPreviewNotice(false), 3000);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md",
              variant === "destructive"
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-foreground"
            )}
          >
            <Icon className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
        <Button
          variant={variant === "destructive" ? "destructive" : "outline"}
          size="sm"
          className="self-start"
          onClick={handleClick}
        >
          {actionLabel}
        </Button>
        {showPreviewNotice ? (
          <p className="text-xs text-muted-foreground" role="status">
            This is a preview — no changes are made.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
