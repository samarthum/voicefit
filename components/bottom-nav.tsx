"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Utensils, Dumbbell, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/metrics", label: "Metrics", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("fixed bottom-4 left-4 right-4 z-50", className)}>
      <div
        className={cn(
          "mx-auto max-w-lg",
          "bg-card/80",
          "backdrop-blur-xl",
          "rounded-2xl border border-border/60",
          "shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
          "px-2"
        )}
      >
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl",
                  "transition-all duration-300",
                  isActive
                    ? "text-primary bg-primary/10 scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isActive && "scale-110"
                  )}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
