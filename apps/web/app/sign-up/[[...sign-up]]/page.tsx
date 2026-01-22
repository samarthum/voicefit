import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/70 p-6 shadow-xl">
        <SignUp />
      </div>
    </div>
  );
}
