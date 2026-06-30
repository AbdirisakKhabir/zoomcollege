import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Sign In"),
  description: `Sign in to ${BRAND.name}`,
};

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-1 items-center justify-center bg-white font-sans dark:bg-gray-950">
        <Loader2 className="size-8 animate-spin text-brand-500" strokeWidth={1.75} />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
