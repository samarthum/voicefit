import React, { createContext, useContext, useState } from "react";
import { View, Pressable, Text, type ViewProps } from "react-native";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

interface TabsProps extends ViewProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  className = "",
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

  const value = controlledValue ?? uncontrolledValue;
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <View className={`gap-4 ${className}`} {...props}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function TabsList({ className = "", children, ...props }: TabsListProps) {
  return (
    <View
      className={`flex-row rounded-xl p-1.5 bg-muted/60 ${className}`}
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
      {...props}
    >
      {children}
    </View>
  );
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export function TabsTrigger({
  value,
  className = "",
  children,
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabs();
  const [pressed, setPressed] = useState(false);
  const isSelected = selectedValue === value;

  const baseClassName = `flex-1 items-center justify-center rounded-lg px-4 py-2.5 ${
    isSelected ? "bg-card" : pressed ? "bg-muted/80" : "bg-transparent"
  } ${className}`;

  return (
    <Pressable
      onPress={() => onValueChange(value)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={baseClassName}
      style={
        isSelected
          ? {
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }
          : undefined
      }
    >
      <Text
        className={`text-sm font-sans-medium ${
          isSelected ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {children}
      </Text>
    </Pressable>
  );
}

interface TabsContentProps extends ViewProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export function TabsContent({
  value,
  className = "",
  children,
  ...props
}: TabsContentProps) {
  const { value: selectedValue } = useTabs();

  if (selectedValue !== value) {
    return null;
  }

  return (
    <View className={className} {...props}>
      {children}
    </View>
  );
}
