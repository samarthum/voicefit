import React from "react";
import { View, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ProgressProps extends ViewProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  variant?: "default" | "accent" | "success" | "secondary";
}

const indicatorGradients: Record<string, [string, string]> = {
  default: ["#16a34a", "rgba(22, 163, 74, 0.8)"],
  accent: ["#f97316", "#fb923c"],
  success: ["#22c55e", "#4ade80"],
  secondary: ["#3b82f6", "#60a5fa"],
};

export function Progress({
  value,
  max = 100,
  className = "",
  indicatorClassName = "",
  variant = "default",
  style,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <View
      className={`h-1.5 w-full rounded-full bg-muted/60 overflow-hidden ${className}`}
      style={style}
      {...props}
    >
      <View style={{ width: `${percentage}%`, height: "100%" }}>
        <LinearGradient
          colors={indicatorGradients[variant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className={`h-full rounded-full ${indicatorClassName}`}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
