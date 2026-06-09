"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect } from "react";
import { LogOutIcon } from "./icons";
import { useSession, signOut, signIn } from "next-auth/react";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const { data: session } = useSession();

  const USER = session?.user || {
    name: "Guest",
    email: "",
    image: "/images/user/user-03.png",
  };

  const handleAutoReauth = async () => {
    setIsOpen(false);
    setIsReauthenticating(true);

    try {
      await signIn("google", {
        callbackUrl: window.location.href,
        prompt: "consent",
      });
    } catch (error) {
      console.error("Reauthentication failed:", error);
    } finally {
      setIsReauthenticating(false);
    }
  };

  const handleLogout = () => {
    setIsOpen(false);
    signOut();
  };

  useEffect(() => {
    const handleApiError = async (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.error === "REAUTHENTICATION_REQUIRED") {
        await handleAutoReauth();
      }
    };

    window.addEventListener("api-error", handleApiError);
    return () => window.removeEventListener("api-error", handleApiError);
  }, []);

  const displayName = isReauthenticating ? "Reauthenticating…" : USER.name || "User";
  const initials = getInitials(USER.name || "User");

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="flex h-9 items-center gap-2 rounded-full border border-transparent pl-0.5 pr-2 outline-none ring-primary ring-offset-2 transition-colors hover:bg-gray/50 focus-visible:ring-1 dark:hover:bg-dark-3 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>
        <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary dark:bg-primary/20">
          {USER.image ? (
            <Image
              src={USER.image}
              alt=""
              width={36}
              height={36}
              className="size-full object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-dark dark:text-white sm:inline">
          {displayName}
        </span>
        <ChevronUpIcon
          aria-hidden
          className={cn(
            "hidden size-4 shrink-0 rotate-180 text-gray-500 transition-transform sm:block dark:text-gray-400",
            isOpen && "rotate-0",
          )}
          strokeWidth={1.5}
        />
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <div className="space-y-1 px-5 py-3.5">
          <div className="text-base font-medium leading-none text-dark dark:text-white">
            {displayName}
          </div>
          <div className="text-sm leading-none text-gray-6">{USER.email}</div>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-gray-600 dark:text-dark-6">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            onClick={handleLogout}
            disabled={isReauthenticating}
          >
            <LogOutIcon />
            <span className="text-base font-medium">Log out</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
