import { solutionOptions, type SolutionOption } from "@/app/solution-range/solutions-data";

import type { DriveVideoItem, MarketingVideoRecord, VideoRegistryEntry } from "@/lib/video-api";



export type MarketingSolutionPick = {

  id: string;

  name: string;

  category: string;

  videoSlug: string;

  crmSolutionTypeId?: string;

  inRegistry: boolean;

  onDrive: boolean;

  hasPublishedVideo: boolean;

  hasDraftVideo: boolean;

  videoStatuses: string[];

};



export function buildMarketingSolutionCatalog(

  registryEntries: VideoRegistryEntry[],

  dbVideos: MarketingVideoRecord[],

  driveVideos: DriveVideoItem[] = []

): MarketingSolutionPick[] {

  const bySlug = new Map<string, MarketingVideoRecord[]>();

  for (const v of dbVideos) {

    if (v.kind !== "marketing") continue;

    const list = bySlug.get(v.slug) || [];

    list.push(v);

    bySlug.set(v.slug, list);

  }



  const registryBySlug = new Map<string, VideoRegistryEntry>();

  for (const e of registryEntries) {

    if (e.kind === "marketing") registryBySlug.set(e.slug, e);

  }



  const driveSlugs = new Set<string>();

  for (const v of driveVideos) {

    if (v.slug) driveSlugs.add(v.slug);

    else if (v.name) {

      const base = v.name.replace(/\.mp4$/i, "").replace(/-(long|30s)$/i, "");

      if (base) driveSlugs.add(base);

    }

  }



  const registryMarketing = registryEntries.filter((e) => e.kind === "marketing");

  const picks: MarketingSolutionPick[] = [];

  const seenSlugs = new Set<string>();



  for (const s of solutionOptions) {

    if (!s.enabled) continue;

    const slug = s.videoSlug;

    if (slug) {

      seenSlugs.add(slug);

      picks.push(

        buildPick(s, slug, bySlug.get(slug) || [], registryBySlug.has(slug), driveSlugs.has(slug))

      );

      continue;

    }

    const regMatch = registryMarketing.find(

      (e) =>

        e.solution_range_ids?.includes(s.id) ||

        (s.crmSolutionTypeId && e.crm_solution_type_id === s.crmSolutionTypeId)

    );

    if (regMatch && !seenSlugs.has(regMatch.slug)) {

      seenSlugs.add(regMatch.slug);

      picks.push(

        buildPick(

          s,

          regMatch.slug,

          bySlug.get(regMatch.slug) || [],

          true,

          driveSlugs.has(regMatch.slug)

        )

      );

    }

  }



  for (const e of registryMarketing) {

    if (seenSlugs.has(e.slug)) continue;

    seenSlugs.add(e.slug);

    const vids = bySlug.get(e.slug) || [];

    picks.push({

      id: e.slug,

      name: e.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),

      category: "registry",

      videoSlug: e.slug,

      crmSolutionTypeId: e.crm_solution_type_id || undefined,

      inRegistry: true,

      onDrive: driveSlugs.has(e.slug),

      hasPublishedVideo: vids.some((v) => v.status === "published"),

      hasDraftVideo: vids.some((v) => v.status === "draft" || v.status === "qa_pending"),

      videoStatuses: [...new Set(vids.map((v) => v.status))],

    });

  }



  return picks.sort((a, b) => a.name.localeCompare(b.name));

}



function buildPick(

  s: SolutionOption,

  slug: string,

  vids: MarketingVideoRecord[],

  inRegistry: boolean,

  onDrive: boolean

): MarketingSolutionPick {

  return {

    id: s.id,

    name: s.name,

    category: s.category,

    videoSlug: slug,

    crmSolutionTypeId: s.crmSolutionTypeId,

    inRegistry,

    onDrive,

    hasPublishedVideo: vids.some((v) => v.status === "published"),

    hasDraftVideo: vids.some((v) => v.status === "draft" || v.status === "qa_pending"),

    videoStatuses: [...new Set(vids.map((v) => v.status))],

  };

}



export type CrmClientPick = {

  id: number;

  business_name: string;

  gdrive_folder_url?: string | null;

};



export type TestimonialPick = {
  id: number;
  business_name: string;
  file_name: string;
  file_id: string;
  file_link?: string | null;
  status: string;
  testimonial_type?: string | null;
  testimonial_solution_type_id?: string | null;
  source?: string | null;
  video_long_file_id?: string | null;
  video_short_file_id?: string | null;
};

/** Google Drive / file link for a CRM testimonial document. */
export function testimonialDocumentUrl(
  t: Pick<TestimonialPick, "file_id" | "file_link">
): string {
  if (t.file_link?.trim()) return t.file_link.trim();
  if (t.file_id.startsWith("http")) return t.file_id;
  return `https://drive.google.com/file/d/${t.file_id}/view`;
}



export function marketingVideoBadge(pick: MarketingSolutionPick): {

  label: string;

  className: string;

} {

  if (pick.hasPublishedVideo) {

    return {

      label: "Published",

      className: "bg-emerald-100 text-emerald-800",

    };

  }

  if (pick.hasDraftVideo) {

    return {

      label: "Draft in system",

      className: "bg-amber-100 text-amber-800",

    };

  }

  if (pick.onDrive) {

    return {

      label: "On Drive",

      className: "bg-sky-100 text-sky-800",

    };

  }

  if (pick.inRegistry) {

    return {

      label: "In catalog",

      className: "bg-violet-100 text-violet-800",

    };

  }

  return {

    label: "No video yet",

    className: "bg-gray-100 text-gray-600",

  };

}


