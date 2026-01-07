import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart, Mic, Utensils, Dumbbell, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen gradient-mesh relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 right-0 w-96 h-96 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <div className="max-w-md text-center space-y-8 animate-fade-up">
          {/* Logo/Icon */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/25 flex items-center justify-center">
            <Heart className="w-10 h-10 text-primary-foreground" />
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl font-display tracking-tight text-foreground">
              Health Tracker
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Your voice-first companion for mindful health tracking.
              Log meals, workouts, and daily progress with ease.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-in">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {[
              { icon: Mic, label: "Voice Input" },
              { icon: Utensils, label: "Meal Tracking" },
              { icon: Dumbbell, label: "Workout Logs" },
              { icon: Activity, label: "Daily Metrics" },
            ].map((feature) => (
              <span
                key={feature.label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm text-sm text-muted-foreground border border-border/50 shadow-sm"
              >
                <feature.icon className="w-4 h-4" />
                {feature.label}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
