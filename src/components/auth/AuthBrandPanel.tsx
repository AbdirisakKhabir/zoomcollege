import Image from "next/image";
import Link from "next/link";
import { BookOpen, Globe, GraduationCap, Mail } from "lucide-react";
import { BRAND } from "@/lib/brand";

export default function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-gray-900 font-sans lg:flex lg:w-[48%] xl:w-1/2">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-800 to-gray-950" />

      <div className="pointer-events-none absolute -left-20 top-24 opacity-[0.06]">
        <GraduationCap className="size-64 text-white" strokeWidth={1} />
      </div>
      <div className="pointer-events-none absolute -right-16 bottom-20 opacity-[0.06]">
        <BookOpen className="size-56 text-white" strokeWidth={1} />
      </div>

      <div className="relative z-10 flex w-full flex-col justify-between px-12 py-14 xl:px-16">
        <Link href="/" className="inline-flex w-fit">
          <div className="rounded-xl bg-white px-5 py-3.5 shadow-xl shadow-black/20">
            <Image
              src={BRAND.logoUrl}
              alt={BRAND.logoAlt}
              width={200}
              height={58}
              className="h-14 w-auto object-contain"
              priority
            />
          </div>
        </Link>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            {BRAND.name}
          </h2>
          <div className="mt-6 h-1 w-12 rounded-full bg-white/40" />
        </div>

        <ul className="space-y-3 text-sm text-white/70">
          <li className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
              <Globe className="size-4 text-white/90" strokeWidth={1.75} />
            </span>
            {BRAND.website}
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
              <Mail className="size-4 text-white/90" strokeWidth={1.75} />
            </span>
            {BRAND.registrarEmail}
          </li>
        </ul>
      </div>
    </aside>
  );
}
