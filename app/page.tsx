import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <main className="flex flex-col items-center gap-8 text-center max-w-md">
        <h1 className="text-4xl font-bold tracking-tight">
          Health Tracker
        </h1>
        <p className="text-lg text-muted-foreground">
          Voice-first personal health tracking. Log meals, workouts, steps, and
          weight with just your voice.
        </p>
        <div className="flex gap-4">
          <Link
            href="/sign-in"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-primary-foreground font-medium transition-colors hover:bg-primary/90"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-6 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Sign Up
          </Link>
        </div>
      </main>
    </div>
  );
}
