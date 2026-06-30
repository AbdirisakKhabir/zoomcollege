"use client";

import Image from "next/image";
import { userDisplayName, userInitials } from "@/lib/chat-utils";

type UserAvatarProps = {
  name: string | null;
  email: string;
  imageUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
};

const sizeClasses = {
  sm: { box: "h-9 w-9 text-xs", image: 36 },
  md: { box: "h-11 w-11 text-sm", image: 44 },
} as const;

export default function UserAvatar({
  name,
  email,
  imageUrl,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const { box, image } = sizeClasses[size];
  const label = userDisplayName({ name, email });

  if (imageUrl) {
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-full ${box} ${className}`}>
        <Image
          src={imageUrl}
          alt={label}
          width={image}
          height={image}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 ${box} ${className}`}
      aria-hidden
    >
      {userInitials({ name, email })}
    </span>
  );
}
