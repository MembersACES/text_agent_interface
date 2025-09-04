"use client";
import Link from "next/link";
import Image from "next/image";
import ACESLogo from "@/../public/images/logo/ACES Logo.png";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center dark:bg-gray-900">
      <div className="mb-6">
        <Image src={ACESLogo} alt="ACES Logo" width={100} height={100} priority />
      </div>

      <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Welcome to the ACES Portal</h1>
      <p className="mt-3 max-w-xl text-lg text-gray-600 dark:text-gray-300">
        Your internal command center — access tools, upload documents, and manage your leads, all in one place.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/business-info"
          className="rounded-xl bg-primary px-6 py-3 text-white shadow-lg transition hover:bg-primary-dark"
        >
          Client Proflie
        </Link>
        <Link
          href="/agent"
          className="rounded-xl border border-gray-300 px-6 py-3 text-gray-700 transition hover:border-gray-500 hover:text-black dark:text-white dark:border-gray-600"
        >
          Launch Agent
        </Link>
        <Link
          href="/loa-upload"
          className="rounded-xl border border-gray-300 px-6 py-3 text-gray-700 transition hover:border-gray-500 hover:text-black dark:text-white dark:border-gray-600"
        >
          Upload LOA
        </Link>
      </div>

      <p className="mt-10 text-sm text-gray-400 dark:text-gray-500">
        ACES Solutions • Internal Platform
      </p>
    </div>
  );
}
