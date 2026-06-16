"use client";

import React from "react";
import Link from "next/link";

type Props = {
  videoSlug: string;
  title?: string;
};

/** Links to the Videos hub filtered by slug (embed requires published Drive file). */
export function SolutionVideoEmbed({ videoSlug, title }: Props) {
  return (
    <section className="my-8 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 p-5">
      <h2 className="text-sm font-semibold text-dark dark:text-white mb-2">
        {title || "Solution video"}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Watch the marketing clip for this solution in the Interface Videos library.
      </p>
      <Link
        href={`/videos?slug=${encodeURIComponent(videoSlug)}`}
        className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Watch video
      </Link>
    </section>
  );
}
