import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import { ThemeProvider } from "@/context/ThemeContext";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col font-sans antialiased lg:flex-row">
        <AuthBrandPanel />
        {children}
      </div>
    </ThemeProvider>
  );
}
