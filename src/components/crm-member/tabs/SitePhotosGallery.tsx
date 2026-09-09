"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { formatDocumentUploadDate } from "@/lib/member-documents-api";
import {
  sitePhotoThumbnailUrl,
  type SitePhoto,
} from "@/lib/site-photos-api";

export function SitePhotosGallery({
  photos,
}: {
  photos: SitePhoto[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo) => (
        <SitePhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
}

function SitePhotoCard({ photo }: { photo: SitePhoto }) {
  const [broken, setBroken] = useState(false);
  const uploaded = formatDocumentUploadDate(photo.created_time || photo.modified_time);
  const href = photo.web_view_link;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-lg border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
    >
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {broken ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <ImageIcon className="h-8 w-8" aria-hidden />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sitePhotoThumbnailUrl(photo)}
            alt={photo.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-100">
          {photo.name}
        </p>
        {uploaded ? (
          <p className="mt-0.5 text-[11px] text-gray-400">Uploaded {uploaded}</p>
        ) : null}
      </div>
    </a>
  );
}
