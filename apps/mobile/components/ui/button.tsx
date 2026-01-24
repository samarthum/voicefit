import React, { useState } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
type ButtonSize = "sm" | "default" | "lg" | "icon";

interface ButtonProps extends Omit<PressableProps, "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
}

const variantGradients: Record<ButtonVariant, [string, string] | null> = {
  default: ["#16a34a", "#15803d"], // primary gradient
  secondary: ["#3b82f6", "#2563eb"], // secondary gradient
  outline: null,
  ghost: null,
  destructive: ["#ef4444", "#dc2626"], // destructive gradient
};

const variantStyles: Record<ButtonVariant, string> = {
  default: "",
  secondary: "",
  outline: "bg-background/90 border-2 border-border/70",
  ghost: "bg-transparent",
  destructive: "",
};

const variantTextStyles: Record<ButtonVariant, string> = {
  default: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
  destructive: "text-white",
};

const variantPressedStyles: Record<ButtonVariant, string> = {
  default: "",
  secondary: "",
  outline: "bg-muted",
  ghost: "bg-muted",
  destructive: "",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-4 rounded-lg",
  default: "h-10 px-5 rounded-xl",
  lg: "h-12 px-8 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

const sizeTextStyles: Record<ButtonSize, string> = {
  sm: "text-sm",
  default: "text-sm",
  lg: "text-base",
  icon: "text-sm",
};

const shadowStyles: Record<ButtonVariant, ViewStyle> = {
  default: {
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondary: {
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  outline: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ghost: {},
  destructive: {
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

export function Button({
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  className = "",
  textClassName = "",
  style,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;
  const gradient = variantGradients[variant];

  const baseClassName = `flex-row items-center justify-center gap-2 overflow-hidden ${sizeStyles[size]} ${
    pressed ? variantPressedStyles[variant] : variantStyles[variant]
  } ${isDisabled ? "opacity-50" : ""} ${className}`;

  const content = loading ? (
    <ActivityIndicator
      size="small"
      color={variant === "outline" || variant === "ghost" ? "#1f2937" : "#fff"}
    />
  ) : typeof children === "string" ? (
    <Text
      className={`font-sans-medium ${sizeTextStyles[size]} ${variantTextStyles[variant]} ${textClassName}`}
    >
      {children}
    </Text>
  ) : (
    children
  );

  return (
    <Pressable
      disabled={isDisabled}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[
        shadowStyles[variant],
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
      {...props}
    >
      {gradient ? (
        <LinearGradient
          colors={pressed ? [gradient[1], gradient[1]] : gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className={baseClassName}
        >
          {content}
        </LinearGradient>
      ) : (
        <View className={baseClassName}>{content}</View>
      )}
    </Pressable>
  );
}
