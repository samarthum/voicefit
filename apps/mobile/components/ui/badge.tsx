import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack";

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
}

const variantGradients: Record<BadgeVariant, [string, string] | null> = {
  default: ["#16a34a", "rgba(22, 163, 74, 0.9)"],
  secondary: ["#3b82f6", "rgba(59, 130, 246, 0.9)"],
  outline: null,
  destructive: ["#ef4444", "rgba(239, 68, 68, 0.9)"],
  breakfast: ["rgba(249, 115, 22, 0.3)", "rgba(249, 115, 22, 0.2)"],
  lunch: ["rgba(34, 197, 94, 0.3)", "rgba(34, 197, 94, 0.2)"],
  dinner: ["rgba(59, 130, 246, 0.3)", "rgba(59, 130, 246, 0.2)"],
  snack: ["rgba(168, 85, 247, 0.3)", "rgba(168, 85, 247, 0.2)"],
};

const variantTextStyles: Record<BadgeVariant, string> = {
  default: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  outline: "text-foreground",
  destructive: "text-white",
  breakfast: "text-breakfast",
  lunch: "text-lunch",
  dinner: "text-dinner",
  snack: "text-snack",
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "",
  secondary: "",
  outline: "bg-background/50 border border-border",
  destructive: "",
  breakfast: "",
  lunch: "",
  dinner: "",
  snack: "",
};

export function Badge({
  variant = "default",
  className = "",
  textClassName = "",
  children,
  style,
  ...props
}: BadgeProps) {
  const gradient = variantGradients[variant];

  const content =
    typeof children === "string" ? (
      <Text
        className={`text-xs font-sans-medium ${variantTextStyles[variant]} ${textClassName}`}
      >
        {children}
      </Text>
    ) : (
      children
    );

  if (gradient) {
    return (
      <View
        className={`rounded-full overflow-hidden self-start ${className}`}
        style={style}
        {...props}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-3 py-1"
        >
          {content}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      className={`rounded-full px-3 py-1 self-start ${variantStyles[variant]} ${className}`}
      style={style}
      {...props}
    >
      {content}
    </View>
  );
}

// Helper to get badge variant from meal type
export function getMealBadgeVariant(
  mealType: string
): "breakfast" | "lunch" | "dinner" | "snack" {
  const type = mealType.toLowerCase();
  if (type === "breakfast") return "breakfast";
  if (type === "lunch") return "lunch";
  if (type === "dinner") return "dinner";
  return "snack";
}
