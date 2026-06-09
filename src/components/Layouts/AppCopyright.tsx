import { BRAND, copyrightNotice } from "@/lib/brand";

interface AppCopyrightProps {
  className?: string;
  compact?: boolean;
}

export function AppCopyright({ className, compact = false }: AppCopyrightProps) {
  return (
    <p
      className={className}
      title={`${BRAND.name} · ${copyrightNotice()}`}
    >
      {compact ? copyrightNotice() : `${BRAND.name} · ${copyrightNotice()}`}
    </p>
  );
}
