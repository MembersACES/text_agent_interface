"use client";

interface FileLinkProps {
  label: string;
  url?: string | null;
}

export function FileLink({ label, url }: FileLinkProps) {
  if (!url) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        Not available
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-primary hover:underline font-medium"
    >
      {label}
    </a>
  );
}

