"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";
import { useSession, signOut, signIn } from "next-auth/react";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const { data: session } = useSession();

  const USER = session?.user || {
    name: "Guest",
    email: "",
    image: "/images/user/user-03.png",
  };

  // Function to handle reauthentication
  const handleReauth = async () => {
    setIsOpen(false);
    try {
      await signIn('google', { 
        callbackUrl: window.location.href,
        prompt: 'consent' // Force consent screen to get fresh tokens
      });
    } catch (error) {
      console.error('Reauthentication failed:', error);
    }
  };

  // Function to handle logout
  const handleLogout = () => {
    setIsOpen(false);
    signOut();
  };

  // Listen for API errors that indicate reauthentication is needed
  useEffect(() => {
    const handleApiError = (event: CustomEvent) => {
      if (event.detail?.error === 'REAUTHENTICATION_REQUIRED') {
        setNeedsReauth(true);
      }
    };

    // Listen for custom events from your API calls
    window.addEventListener('api-error', handleApiError as EventListener);
    
    return () => {
      window.removeEventListener('api-error', handleApiError as EventListener);
    };
  }, []);

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-3">
          <Image
            src={USER.image || "/images/user/user-03.png"}
            className="size-12"
            alt={`Avatar of ${USER.name}`}
            role="presentation"
            width={200}
            height={200}
          />
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span>{USER.name}</span>

            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          <Image
            src={USER.image || "/images/user/user-03.png"}
            className="size-12"
            alt={`Avatar for ${USER.name}`}
            role="presentation"
            width={200}
            height={200}
          />

          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-dark dark:text-white">
              {USER.name}
            </div>

            <div className="leading-none text-gray-6">{USER.email}</div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6 [&>*]:cursor-pointer">
          <Link
            href={"/profile"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <UserIcon />

            <span className="mr-auto text-base font-medium">View profile</span>
          </Link>

          <Link
            href={"/pages/settings"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <SettingsIcon />

            <span className="mr-auto text-base font-medium">
              Account Settings
            </span>
          </Link>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          {needsReauth ? (
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
              onClick={handleReauth}
            >
              <LogOutIcon />
              <span className="text-base font-medium">Reauthentication required</span>
            </button>
          ) : (
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
              onClick={handleLogout}
            >
              <LogOutIcon />
              <span className="text-base font-medium">Log out</span>
            </button>
          )}
        </div>
      </DropdownContent>
    </Dropdown>
  );
}