import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/70 p-6 shadow-xl">
        <SignIn
          appearance={{
            variables: {
              colorPrimary: "rgb(22, 163, 74)",
              colorText: "rgb(31, 41, 55)",
              colorTextSecondary: "rgb(107, 114, 128)",
              colorBackground: "rgb(255, 255, 255)",
              colorInputBackground: "rgb(255, 255, 255)",
            },
            elements: {
              card: "bg-transparent shadow-none",
              headerTitle: "text-foreground",
              headerSubtitle: "text-muted-foreground",
              formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
              socialButtonsBlockButton:
                "border border-border/70 text-foreground hover:bg-muted/40",
              footerActionLink: "text-primary hover:text-primary/80",
            },
          }}
        />
      </div>
    </div>
  );
}
