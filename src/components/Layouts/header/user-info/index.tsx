"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { LogOutIcon } from "./icons";
import { useSession, signOut, signIn } from "next-auth/react";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const { data: session } = useSession();

  const USER = session?.user || {
    name: "Guest",
    email: "",
    image: "/images/user/user-03.png",
  };

  // Automatic reauthentication
  const handleAutoReauth = async () => {
    setIsOpen(false);
    setIsReauthenticating(true);

    try {
      await signIn("google", {
        callbackUrl: window.location.href,
        prompt: "consent", // Force consent screen to get fresh tokens
      });
    } catch (error) {
      console.error("Reauthentication failed:", error);
    } finally {
      setIsReauthenticating(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setIsOpen(false);
    signOut();
  };

  // Listen for API errors and automatically trigger reauthentication
  useEffect(() => {
    const handleApiError = async (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.error === "REAUTHENTICATION_REQUIRED") {
        console.log("Reauthentication required - automatically triggering...");
        await handleAutoReauth();
      }
    };

    window.addEventListener("api-error", handleApiError);

    return () => {
      window.removeEventListener("api-error", handleApiError);
    };
  }, []);

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <div className="flex items-center gap-1 font-medium text-dark dark:text-dark-6">
          <span>{isReauthenticating ? "Reauthenticating..." : USER.name}</span>

          <ChevronUpIcon
            aria-hidden
            className={cn(
              "rotate-180 transition-transform",
              isOpen && "rotate-0",
            )}
            strokeWidth={1.5}
          />
        </div>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <div className="px-5 py-3.5 space-y-1">
          <div className="mb-2 text-base font-medium leading-none text-dark dark:text-white">
            {isReauthenticating ? "Reauthenticating..." : USER.name}
          </div>

          <div className="text-base leading-none text-gray-6">
            {USER.email}
          </div>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
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