"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MealCard } from "@/components/meal-card";
import { VoiceMealLogger } from "@/components/voice-meal-logger";
import { BottomNav } from "@/components/bottom-nav";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Plus, Utensils, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
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

function formatDateLabel(dateString: string): string {
  const today = new Date().toLocaleDateString("en-CA");
  if (dateString === today) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateString === yesterday.toLocaleDateString("en-CA")) return "Yesterday";

  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalMeals, setTotalMeals] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toLocaleDateString("en-CA");
  });
  const pageSize = 10;

  const fetchMeals = useCallback(async () => {
    try {
      setIsLoading(true);
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
      });
      if (selectedDate) {
        params.set("date", selectedDate);
      }
      const response = await fetch(`/api/meals?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const { meals: fetchedMeals, total } = result.data;
        if (page > 1 && offset >= total) {
          setPage(page - 1);
          return;
        }
        setMeals(fetchedMeals);
        setTotalMeals(total);
      } else {
        toast.error("Failed to load meals");
      }
    } catch (error) {
      console.error("Meals fetch error:", error);
      toast.error("Failed to load meals");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedDate]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleMealSaved = () => {
    setMealSheetOpen(false);
    if (page === 1) {
      fetchMeals();
    } else {
      setPage(1);
    }
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
        if (meals.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          fetchMeals();
        }
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

  const groupedMeals = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        meals: Meal[];
      }
    >();

    meals.forEach((meal) => {
      const date = new Date(meal.eatenAt);
      const key = date.toDateString();
      const label = date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (!groups.has(key)) {
        groups.set(key, { label, meals: [] });
      }

      groups.get(key)?.meals.push(meal);
    });

    return Array.from(groups.values());
  }, [meals]);

  const totalPages = Math.ceil(totalMeals / pageSize);
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  return (
    <div className="min-h-screen bg-background pb-28">
      <Toaster />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-background/90 via-background/80 to-background/70 backdrop-blur-sm border-b border-border/60">
        <div className="flex h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <h1 className="text-lg font-display text-foreground">Meal Logs</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/70 p-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              const current = new Date(selectedDate + "T12:00:00");
              current.setDate(current.getDate() - 1);
              setSelectedDate(current.toLocaleDateString("en-CA"));
              setPage(1);
            }}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={() => {
              const input = document.getElementById("meal-date-picker") as HTMLInputElement;
              input?.showPicker?.();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{formatDateLabel(selectedDate)}</span>
          </button>
          <input
            id="meal-date-picker"
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setPage(1);
            }}
            className="sr-only"
          />

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              const current = new Date(selectedDate + "T12:00:00");
              current.setDate(current.getDate() + 1);
              setSelectedDate(current.toLocaleDateString("en-CA"));
              setPage(1);
            }}
            disabled={selectedDate === new Date().toLocaleDateString("en-CA")}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Add Meal Button */}
        <div className="animate-fade-up">
          <Sheet open={mealSheetOpen} onOpenChange={setMealSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-border/60 bg-card/70 text-foreground hover:bg-card"
              >
                <Plus className="h-4 w-4 mr-2" />
                Log Meal
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">Log Meal</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col items-center justify-center py-8">
                <VoiceMealLogger onMealSaved={handleMealSaved} />
                <p className="text-sm text-muted-foreground mt-6 text-center">
                  Tap the button and describe your meal
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Meals List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-medium">No meals logged yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap the button above to log your first meal
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMeals.map((group) => (
              <section key={group.label} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
                  <span className="text-xs text-muted-foreground">
                    {group.meals.length} meal{group.meals.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-3 stagger-children">
                  {group.meals.map((meal) => (
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
              </section>
            ))}
          </div>
        )}

        {!isLoading && meals.length > 0 ? (
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!canGoBack}
            >
              Previous
            </Button>
            <div className="text-xs text-muted-foreground">
              Page {page} of {Math.max(totalPages, 1)} · {totalMeals} meals
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={!canGoForward}
            >
              Next
            </Button>
          </div>
        ) : null}
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
