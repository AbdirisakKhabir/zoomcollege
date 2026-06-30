"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import AuthThemeToggle from "@/components/auth/AuthThemeToggle";
import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BRAND } from "@/lib/brand";
import { normalizeRedirectParam, redirectAfterAuth } from "@/lib/auth-client-redirect";
import { useSearchParams } from "next/navigation";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-white font-sans dark:bg-gray-950">
      <Loader2 className="size-8 animate-spin text-brand-500" strokeWidth={1.75} />
    </div>
  );
}

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, login, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const redirect = normalizeRedirectParam(searchParams.get("redirect"));

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      redirectAfterAuth(redirect);
    }
  }, [user, isLoading, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    redirectAfterAuth(redirect);
  };

  if (isLoading || user) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white font-sans dark:bg-gray-950 lg:w-[52%] xl:w-1/2">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="lg:hidden">
          <Image
            src={BRAND.logoUrl}
            alt={BRAND.logoAlt}
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>
        <div className="hidden lg:block" />
        <AuthThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <LogIn className="size-5" strokeWidth={1.75} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Sign in
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              {BRAND.name}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Label htmlFor="signin-email">
                Email <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  strokeWidth={1.75}
                />
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder={`name@${BRAND.emailDomain}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  error={!!error && !email.trim()}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="signin-password">
                Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  strokeWidth={1.75}
                />
                <Input
                  id="signin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-11"
                  error={!!error && !password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-[18px]" strokeWidth={1.75} />
                  ) : (
                    <Eye className="size-[18px]" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <Button
              className="w-full !gap-2 !py-3"
              size="md"
              type="submit"
              disabled={loading}
              startIcon={
                loading ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                ) : (
                  <LogIn className="size-4" strokeWidth={1.75} />
                )
              }
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} {BRAND.name}
          </p>
        </div>
      </div>
    </div>
  );
}
