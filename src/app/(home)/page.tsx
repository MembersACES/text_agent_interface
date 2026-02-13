"use client";
import Link from "next/link";
import Image from "next/image";
import ACESLogo from "@/../public/images/logo/CARBON ZERO Logo.png";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center dark:bg-gray-900">
      <div className="mb-6">
        <Image src={ACESLogo} alt="ACES Logo" width={200} height={200} priority />
      </div>

      <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Welcome to the ACES Portal</h1>
      <p className="mt-3 max-w-xl text-lg text-gray-600 dark:text-gray-300">
        Your internal command center — access tools, upload documents, and manage your leads, all in one place.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/business-info"
          className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-white shadow-lg transition hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
        >
          Client Profile
        </Link>
        <Link
          href="/tasks"
          className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-white shadow-lg transition hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
        >
          View Tasks
        </Link>
        <Link
          href="/resources"
          className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-white shadow-lg transition hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
        >
          Key Resources
        </Link>
      </div>

      <p className="mt-10 text-sm text-gray-400 dark:text-gray-500">
        ACES Solutions • Internal Platform
      </p>
    </div>
  );
}
