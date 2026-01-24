import React, { useEffect, useRef } from "react";
import { View, Animated, type ViewProps, type DimensionValue } from "react-native";

interface SkeletonProps extends ViewProps {
  className?: string;
  width?: DimensionValue;
  height?: DimensionValue;
}

export function Skeleton({
  className = "",
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.7],
  });

  return (
    <Animated.View
      className={`bg-muted rounded-lg ${className}`}
      style={[
        {
          opacity,
          width,
          height,
        },
        style,
      ]}
      {...props}
    />
  );
}

// Preset skeleton shapes
export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <View className={`gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 rounded"
          width={i === lines - 1 && lines > 1 ? "75%" : "100%"}
        />
      ))}
    </View>
  );
}

export function SkeletonCircle({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      className={`rounded-full ${className}`}
      width={size}
      height={size}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <View
      className={`bg-card rounded-2xl border border-border/60 p-6 gap-4 ${className}`}
    >
      <View className="flex-row items-center gap-3">
        <SkeletonCircle size={48} />
        <View className="flex-1 gap-2">
          <Skeleton className="h-4 rounded" width="75%" />
          <Skeleton className="h-3 rounded" width="50%" />
        </View>
      </View>
      <SkeletonText lines={3} />
    </View>
  );
}
