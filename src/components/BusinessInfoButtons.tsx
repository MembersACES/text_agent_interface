import React from "react";

const base =
  "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none";

export function PrimaryButton({
  children,
  className = "",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "default" | "sm";
}) {
  const sizeClass =
    size === "sm"
      ? "px-2 py-1 text-xs rounded"
      : "px-3 py-1.5 text-sm rounded-lg";
  return (
    <button
      className={`${base} ${sizeClass} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "default" | "sm";
}) {
  const sizeClass =
    size === "sm"
      ? "px-2 py-1 text-xs rounded"
      : "px-3 py-1.5 text-sm rounded";
  return (
    <button
      className={`${base} ${sizeClass} border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 focus:ring-gray-400 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Text/link-style button for low-emphasis actions (e.g. Edit, Delete on notes) */
export function LinkButton({
  children,
  className = "",
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  const colorClass = danger
    ? "text-red-600 hover:text-red-800 hover:bg-red-50"
    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100";
  return (
    <button
      className={`${base} text-sm px-3 py-1.5 rounded font-medium ${colorClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
