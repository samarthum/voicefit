import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden shadow-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-primary/20 [a&]:hover:from-primary/95",
        secondary:
          "border-transparent bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground [a&]:hover:from-secondary/95",
        destructive:
          "border-transparent bg-gradient-to-r from-destructive to-destructive/90 text-white shadow-destructive/20 [a&]:hover:from-destructive/95 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "text-foreground bg-background/50 backdrop-blur-sm [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // Meal type variants with semantic colors
        breakfast:
          "border-transparent bg-gradient-to-r from-breakfast/30 to-breakfast/20 text-breakfast dark:from-breakfast/20 dark:to-breakfast/10",
        lunch:
          "border-transparent bg-gradient-to-r from-lunch/30 to-lunch/20 text-lunch dark:from-lunch/20 dark:to-lunch/10",
        dinner:
          "border-transparent bg-gradient-to-r from-dinner/30 to-dinner/20 text-dinner dark:from-dinner/20 dark:to-dinner/10",
        snack:
          "border-transparent bg-gradient-to-r from-snack/30 to-snack/20 text-snack dark:from-snack/20 dark:to-snack/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
