import React, { forwardRef } from "react";
import { TextInput, View, Text, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  className?: string;
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ className = "", label, error, helperText, style, ...props }, ref) => {
    return (
      <View className="gap-1.5">
        {label && (
          <Text className="text-sm font-sans-medium text-foreground">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          className={`h-11 px-4 rounded-xl border bg-background/80 text-foreground font-sans ${
            error ? "border-destructive" : "border-border"
          } ${className}`}
          placeholderTextColor="#6b7280"
          style={[
            {
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            },
            style,
          ]}
          {...props}
        />
        {error && (
          <Text className="text-xs text-destructive font-sans">{error}</Text>
        )}
        {helperText && !error && (
          <Text className="text-xs text-muted-foreground font-sans">
            {helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
