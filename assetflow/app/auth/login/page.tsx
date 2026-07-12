import { Metadata } from "next";
import { LoginForm } from "./login-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in - AssetFlow",
  description: "Sign in to your AssetFlow account.",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in to AssetFlow
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and password below to log in
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
