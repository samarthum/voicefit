import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface CardProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className = "", children, style, ...props }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-border/60 overflow-hidden ${className}`}
      style={[
        {
          shadowColor: "#16a34a",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        },
        style,
      ]}
      {...props}
    >
      <LinearGradient
        colors={["#ffffff", "#ffffff", "rgba(255,255,255,0.95)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

interface CardHeaderProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({
  className = "",
  children,
  ...props
}: CardHeaderProps) {
  return (
    <View className={`px-6 pt-6 gap-2 ${className}`} {...props}>
      {children}
    </View>
  );
}

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function CardTitle({ className = "", children }: CardTitleProps) {
  return (
    <Text
      className={`text-lg font-sans-semibold text-card-foreground leading-tight ${className}`}
    >
      {children}
    </Text>
  );
}

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function CardDescription({
  className = "",
  children,
}: CardDescriptionProps) {
  return (
    <Text className={`text-muted-foreground text-sm ${className}`}>
      {children}
    </Text>
  );
}

interface CardContentProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function CardContent({
  className = "",
  children,
  ...props
}: CardContentProps) {
  return (
    <View className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </View>
  );
}

interface CardFooterProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function CardFooter({
  className = "",
  children,
  ...props
}: CardFooterProps) {
  return (
    <View className={`px-6 pb-6 flex-row items-center ${className}`} {...props}>
      {children}
    </View>
  );
}
