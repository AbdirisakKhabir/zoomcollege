import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND.name,
  description: `${BRAND.name} Admin Dashboard`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${outfit.className}`}>
      <body className="min-h-screen overflow-x-clip antialiased font-sans dark:bg-gray-900">
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
