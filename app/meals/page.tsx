"use client";

import { useEffect, useState, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MealCard } from "@/components/meal-card";
import { VoiceMealLogger } from "@/components/voice-meal-logger";
import { BottomNav } from "@/components/bottom-nav";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast, Toaster } from "sonner";

interface Meal {
  id: string;
  eatenAt: string;
  mealType: string;
  description: string;
  calories: number;
  transcriptRaw: string | null;
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMeals = useCallback(async () => {
    try {
      const response = await fetch("/api/meals?limit=50");
      const result = await response.json();

      if (result.success) {
        setMeals(result.data.meals);
      } else {
        toast.error("Failed to load meals");
      }
    } catch (error) {
      console.error("Meals fetch error:", error);
      toast.error("Failed to load meals");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleMealSaved = () => {
    setMealSheetOpen(false);
    fetchMeals();
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/meals/${deleteId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Meal deleted");
        setMeals((prev) => prev.filter((m) => m.id !== deleteId));
      } else {
        toast.error("Failed to delete meal");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete meal");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Toaster />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Meal Logs</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Add Meal Button */}
        <Sheet open={mealSheetOpen} onOpenChange={setMealSheetOpen}>
          <SheetTrigger asChild>
            <Button className="w-full" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Log Meal
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Log Meal</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col items-center justify-center py-8">
              <VoiceMealLogger onMealSaved={handleMealSaved} />
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Hold the button and describe your meal
              </p>
            </div>
          </SheetContent>
        </Sheet>

        {/* Meals List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No meals logged yet.</p>
            <p className="text-sm">Tap the button above to log your first meal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <MealCard
                key={meal.id}
                id={meal.id}
                description={meal.description}
                calories={meal.calories}
                mealType={meal.mealType}
                eatenAt={meal.eatenAt}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}
      </main>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Meal"
        description="Are you sure you want to delete this meal? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />

      <BottomNav />
    </div>
  );
}
