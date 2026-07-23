import type { ReactNode } from "react";
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
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
