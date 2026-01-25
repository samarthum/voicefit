import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

interface HeaderTitleProps {
  title: string;
  subtitle?: string;
}

export function HeaderBackground() {
  return (
    <View style={styles.container}>
      <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(248, 250, 252, 0.95)", "rgba(248, 250, 252, 0.8)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.border} />
    </View>
  );
}

export function HeaderTitle({ title, subtitle }: HeaderTitleProps) {
  return (
    <View className="gap-1">
      <Text className="text-lg font-display text-foreground">{title}</Text>
      {subtitle ? (
        <Text className="text-xs text-muted-foreground font-sans">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  border: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.12)",
  },
});
