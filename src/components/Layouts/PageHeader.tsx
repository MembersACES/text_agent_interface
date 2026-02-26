import Link from "next/link";

interface PageHeaderProps {
  /** Used for breadcrumb and as default title */
  pageName: string;
  /** Override title when it differs from pageName (e.g. "Client" for client detail) */
  title?: string;
  /** Optional short description below the title */
  description?: string;
}

export function PageHeader({ pageName, title, description }: PageHeaderProps) {
  const displayTitle = title ?? pageName;

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/" className="font-medium text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary">
                Dashboard
              </Link>
            </li>
            <li className="font-medium text-primary" aria-current="page">
              {pageName}
            </li>
          </ol>
        </nav>
        <h1 className="mt-2 text-heading-5 font-bold text-dark dark:text-white">
          {displayTitle}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
