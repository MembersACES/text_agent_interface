
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useToast } from "@/components/ui/toast";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Search,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Zap,
  Code2,
  Globe,
  Lock,
  Film,
  Loader2,
  Link2,
  LayoutDashboard,
} from "lucide-react";
import { cn, getApiBaseUrl } from "@/lib/utils";

const VIDEOS_DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/folders/1VmTut-4mztUiz95g2BqnZTMoeCVMhsb9";

type DriveVideoItem = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  previewUrl: string;
  createdTime?: string;
};

interface Resource {
  name: string;
  link: string;
  password: string;
  notes?: string;
  env: "production" | "development";
  category?: string;
  /** When true, listed under Dashboard Links instead of Production / Development */
  dashboardLink?: boolean;
}

const RESOURCES: Resource[] = [
  {
    name: "ACES Demo",
    link: "https://acesdemo-672026052958.australia-southeast2.run.app/",
    password: "ACES_demo1@!",
    notes: "ACES Demo is a demo of the Aces Solutions platform. It is used to test the platform and the features of the platform.",
    env: "development",
    category: "Demo",
  },
  {
    name: "ACES Automation Hub",
    link: "https://aces-automation-hub-672026052958.australia-southeast2.run.app/",
    password: "ACES_auto_Hub1!",
    notes: "ACES Automation Hub is a platform for automating the Aces Solutions platform. It is used to test the platform and the features of the platform.",
    env: "production",
    category: "Automation",
  },
  {
    name: "Text Agent Templates",
    link: "https://text-agent-template-672026052958.australia-southeast2.run.app",
    password: "CZA12!",
    notes: "Text Agent Templates is a platform for creating and testing text agents. It is used to test the platform and the features of the platform.",
    env: "production",
    category: "Templates",
  },
  {
    name: "Text Agent Templates Dev",
    link: "https://text-agent-template-dev-672026052958.australia-southeast2.run.app",
    password: "ACESmultiagent1!@",
    notes: "Text Agent Templates Dev is a platform for creating and testing text agents. It is used to test the platform and the features of the platform.",
    env: "development",
    category: "Templates",
  },
  {
    name: "Interface Development",
    link: "https://acesagentinterfacedev-672026052958.australia-southeast2.run.app",
    password: "N/A",
    notes: "Interface Development is a platform for developing and testing interface development. It is used to test the platform and the features of the platform.",
    env: "development",
    category: "Interface",
  },
  {
    name: "Pudu Maintenance English",
    link: "https://pudu-chatbot-english-672026052958.australia-southeast2.run.app/",
    password: "Bot_Maintenance_Agent!1",
    notes: "A maintence chatbot (text or voice) for Pudu robots to answer maintenance related questions English. ",
    env: "production",
    category: "Chatbot",
  },
  {
    name: "Pudu Multilanguage",
    link: "https://pudu-chatbot-672026052958.australia-southeast2.run.app/",
    password: "PuduAgent1!2@!",
    notes: "A maintence chatbot (text or voice) for Pudu robots to answer maintenance related questions in 10 languages. ",
    env: "production",
    category: "Chatbot",
  },
  {
    name: "Premium Waste Request Assistant",
    link: "https://premium-waste-request-assistant-711534973905.australia-southeast2.run.app/",
    password: "CZAWasteRequest",
    notes:
      "Carbon Zero Australasia request intake: classify waste requests (missed service, bin issues, new service, schedule changes, enquiries), collect site and contact details, and assign P1 / P2 / P3 priority with structured handoff. Text, voice, and form channels.",
    env: "production",
    category: "Carbon Zero",
  },
  {
    name: "Pudu Customer Support Agent",
    link: "https://robot-teams-711534973905.australia-southeast2.run.app/",
    password: "pudu",
    notes:
      "Work in progress — multi-agent customer support hub (sales, solutions, support, maintenance, and related sub-agents). Not all branches are active yet.",
    env: "development",
    category: "Pudu",
  },
  {
    name: "Airtable Integration",
    link: "https://airtable.com/embed/appG1WoHcJt10iO5K/shrr1PYlng8vWqrF1?viewControls=on",
    password: "N/A",
    notes: "Access all Airtable databases (LOA, C&I E, SME E, C&I G, SME G, Waste)",
    env: "production",
    category: "Dashboard",
    dashboardLink: true,
  },
  {
    name: "Contract Ending / Expiring",
    link: "/resources/contract-ending",
    password: "N/A",
    notes: "View C&I Electricity and C&I Gas contract end dates; sync from Google Sheet to Airtable.",
    env: "production",
    category: "Dashboard",
    dashboardLink: true,
  },
  {
    name: "Discrepancy Check",
    link: "/resources/discrepancy-check",
    password: "N/A",
    notes: "View C&I Gas rate/contract discrepancies from Google Sheet; filter by business or identifier.",
    env: "production",
    category: "Dashboard",
    dashboardLink: true,
  },
];


const CATEGORY_COLORS: Record<string, string> = {
  Platform: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Templates: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Carbon Zero":
    "bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200",
  Pudu: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Integration: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Interface: "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  Resources: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  Dashboard:
    "bg-indigo-50 text-indigo-800 dark:bg-indigo-900/35 dark:text-indigo-200",
};

/** Notes longer than this show a collapsed preview with “Show more”. */
const NOTES_EXPAND_THRESHOLD = 120;

function ResourceCard({
  resource,
  index,
  visiblePasswords,
  onTogglePassword,
  onCopy,
}: {
  resource: Resource;
  index: number;
  visiblePasswords: Set<number>;
  onTogglePassword: (i: number) => void;
  onCopy: (text: string, type: string) => void;
}) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const isPasswordVisible = visiblePasswords.has(index);
  const isPasswordNA = resource.password === "N/A";
  const hasPassword = resource.password !== "" && resource.password !== "N/A";

  const isInternalLink = resource.link.startsWith("/");
  const isValidUrl = (url: string) => {
    if (url.startsWith("/")) return true;
    try { new URL(url); return true; } catch { return false; }
  };

  const rawNotes = resource.notes?.trim() ?? "";
  const notesExpandable = rawNotes.length > NOTES_EXPAND_THRESHOLD;

  return (
    <div className="group relative flex flex-col bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-3 hover:shadow-md hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-200">
      {/* Top row: name + category badge */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <h3 className="text-dark dark:text-white font-semibold text-sm leading-snug pr-1">
          {resource.name}
        </h3>
        {resource.category && (
          <span
            className={cn(
              "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-tight max-w-[9rem] truncate",
              CATEGORY_COLORS[resource.category] ?? "bg-gray-100 text-gray-600"
            )}
            title={resource.category}
          >
            {resource.category}
          </span>
        )}
      </div>

      {/* Notes */}
      {rawNotes ? (
        <div className="mb-2 flex-1 min-h-0">
          <p
            className={cn(
              "text-xs text-gray-500 dark:text-gray-400 leading-snug",
              notesExpandable && !notesExpanded && "line-clamp-2"
            )}
          >
            {rawNotes}
          </p>
          {notesExpandable && (
            <button
              type="button"
              onClick={() => setNotesExpanded((v) => !v)}
              className="mt-1 text-[11px] font-medium text-primary hover:underline"
            >
              {notesExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs italic text-gray-300 dark:text-gray-600 mb-2 flex-1">No notes</p>
      )}

      {/* Divider */}
      <div className="border-t border-stroke dark:border-dark-3 pt-2 space-y-1.5">
        {/* Link row */}
        <div className="flex items-center gap-1.5">
          <Globe className="h-3 w-3 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            {isInternalLink ? (
              <Link
                href={resource.link}
                className="text-primary hover:underline text-xs truncate flex items-center gap-1"
                title={resource.link}
              >
                <span className="truncate">{resource.link}</span>
              </Link>
            ) : isValidUrl(resource.link) ? (
              <a
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-xs truncate flex items-center gap-1"
                title={resource.link}
              >
                <span className="truncate">{resource.link.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="text-xs text-gray-400 truncate">{resource.link}</span>
            )}
            <button
              onClick={() => onCopy(resource.link, "Link")}
              className="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors"
              title="Copy link"
            >
              <Copy className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Password row */}
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-gray-400 shrink-0" />
          {isPasswordNA ? (
            <span className="text-xs text-gray-400 italic">No password required</span>
          ) : hasPassword ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs bg-gray-50 dark:bg-dark-2 border border-gray-200 dark:border-dark-3 rounded px-2 py-0.5 text-gray-600 dark:text-gray-400">
                {isPasswordVisible ? resource.password : "••••••••"}
              </span>
              <button
                onClick={() => onTogglePassword(index)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors"
                title={isPasswordVisible ? "Hide" : "Show"}
              >
                {isPasswordVisible
                  ? <EyeOff className="h-3.5 w-3.5 text-gray-400" />
                  : <Eye className="h-3.5 w-3.5 text-gray-400" />}
              </button>
              <button
                onClick={() => onCopy(resource.password, "Password")}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors"
                title="Copy password"
              >
                <Copy className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">No password set</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken;

  const [searchTerm, setSearchTerm] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const { showToast } = useToast();

  const [driveVideos, setDriveVideos] = useState<DriveVideoItem[]>([]);
  const [driveVideosFolderUrl, setDriveVideosFolderUrl] = useState(VIDEOS_DRIVE_FOLDER_URL);
  const [driveVideosLoading, setDriveVideosLoading] = useState(true);
  const [driveVideosError, setDriveVideosError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"links" | "videos">("links");

  const loadDriveVideos = useCallback(async () => {
    if (!token) {
      setDriveVideosLoading(false);
      setDriveVideosError(null);
      setDriveVideos([]);
      return;
    }
    setDriveVideosLoading(true);
    setDriveVideosError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/resources/drive-videos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        folder_url?: string;
        videos?: DriveVideoItem[];
      };
      if (!res.ok) {
        throw new Error(data.detail || `Could not load videos (${res.status})`);
      }
      if (data.folder_url) setDriveVideosFolderUrl(data.folder_url);
      setDriveVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch (e) {
      setDriveVideosError(e instanceof Error ? e.message : "Failed to load videos");
      setDriveVideos([]);
    } finally {
      setDriveVideosLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    loadDriveVideos();
  }, [sessionStatus, loadDriveVideos]);

  const filteredResources = useMemo(() => {
    if (!searchTerm) return RESOURCES;
    const search = searchTerm.toLowerCase();
    return RESOURCES.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.link.toLowerCase().includes(search) ||
        r.notes?.toLowerCase().includes(search) ||
        r.password.toLowerCase().includes(search) ||
        r.category?.toLowerCase().includes(search)
    );
  }, [searchTerm]);

  const dashboardResources = filteredResources.filter((r) => r.dashboardLink);
  const productionResources = filteredResources.filter((r) => !r.dashboardLink && r.env === "production");
  const developmentResources = filteredResources.filter((r) => !r.dashboardLink && r.env === "development");

  const togglePasswordVisibility = (index: number) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${type} copied to clipboard`, "success");
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
  };

  // We need stable indices across the full RESOURCES array for password toggling
  const getResourceIndex = (resource: Resource) => RESOURCES.indexOf(resource);

  return (
    <div className="space-y-6">
      <Breadcrumb />

      {/* Header */}
      <div>
        <h1 className="text-heading-3 font-bold text-dark dark:text-white mb-2">Links & Passwords</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Central repository for resource links, credentials, and training videos
        </p>
      </div>

      {/* Links | Videos */}
      <div
        className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-stroke dark:border-dark-3 bg-white/90 dark:bg-gray-dark/90 backdrop-blur-md p-1.5 shadow-sm"
        role="tablist"
        aria-label="Resources sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "links"}
          id="resources-tab-links"
          aria-controls="resources-panel-links"
          onClick={() => setMainTab("links")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            mainTab === "links"
              ? "bg-primary text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-3"
          )}
        >
          <Link2 className="h-4 w-4 shrink-0 opacity-90" />
          Links
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "videos"}
          id="resources-tab-videos"
          aria-controls="resources-panel-videos"
          onClick={() => setMainTab("videos")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            mainTab === "videos"
              ? "bg-primary text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-3"
          )}
        >
          <Film className="h-4 w-4 shrink-0 opacity-90" />
          Videos
          {!driveVideosLoading && driveVideos.length > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums",
                mainTab === "videos"
                  ? "bg-white/20 text-white"
                  : "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
              )}
            >
              {driveVideos.length}
            </span>
          )}
        </button>
      </div>

      {mainTab === "links" && (
        <div id="resources-panel-links" role="tabpanel" aria-labelledby="resources-tab-links" className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, category, link, or notes..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-stroke rounded-lg bg-white dark:bg-gray-dark dark:border-dark-3 text-dark dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dashboard Links — in-app / CRM resource pages */}
      <section>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/25 border border-indigo-200 dark:border-indigo-800 rounded-md px-2 py-1">
            <LayoutDashboard className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">Dashboard Links</span>
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {dashboardResources.length} item{dashboardResources.length !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 -mt-0.5">
          Shortcuts to tools used from this dashboard (embedded bases and internal resource pages).
        </p>
        {dashboardResources.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">No dashboard links match your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dashboardResources.map((resource) => {
              const idx = getResourceIndex(resource);
              return (
                <ResourceCard
                  key={idx}
                  resource={resource}
                  index={idx}
                  visiblePasswords={visiblePasswords}
                  onTogglePassword={togglePasswordVisibility}
                  onCopy={copyToClipboard}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Production + Development: side-by-side on xl to reduce vertical scroll */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 xl:gap-6 items-start">
      {/* Production Section */}
      <section>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md px-2 py-1">
            <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Production</span>
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {productionResources.length} item{productionResources.length !== 1 ? "s" : ""}
          </span>
        </div>

        {productionResources.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">No production resources match your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 min-[1600px]:grid-cols-3 gap-3">
            {productionResources.map((resource) => {
              const idx = getResourceIndex(resource);
              return (
                <ResourceCard
                  key={idx}
                  resource={resource}
                  index={idx}
                  visiblePasswords={visiblePasswords}
                  onTogglePassword={togglePasswordVisibility}
                  onCopy={copyToClipboard}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Development Section */}
      <section>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1">
            <Code2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Development</span>
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {developmentResources.length} item{developmentResources.length !== 1 ? "s" : ""}
          </span>
        </div>

        {developmentResources.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">No development resources match your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 min-[1600px]:grid-cols-3 gap-3">
            {developmentResources.map((resource) => {
              const idx = getResourceIndex(resource);
              return (
                <ResourceCard
                  key={idx}
                  resource={resource}
                  index={idx}
                  visiblePasswords={visiblePasswords}
                  onTogglePassword={togglePasswordVisibility}
                  onCopy={copyToClipboard}
                />
              );
            })}
          </div>
        )}
      </section>
      </div>
        </div>
      )}

      {mainTab === "videos" && (
        <div id="resources-panel-videos" role="tabpanel" aria-labelledby="resources-tab-videos">
      {/* Videos from Google Drive */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-1.5">
            <Film className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-semibold text-violet-800 dark:text-violet-200">Videos</span>
          </div>
          <a
            href={driveVideosFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Open folder in Google Drive
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Clips listed here are read from the shared Drive folder. Inline playback works when your Google account can
          view the file; otherwise use{" "}
          <span className="font-medium text-dark dark:text-white">Open in Google Drive</span> on each card.
        </p>
        {sessionStatus === "unauthenticated" && (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            Sign in to load the video list from the server.
          </p>
        )}
        {driveVideosLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading videos…
          </div>
        )}
        {!driveVideosLoading && driveVideosError && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 space-y-2">
            <p>{driveVideosError}</p>
            <p className="text-gray-600 dark:text-gray-400">
              Ensure the backend Drive service account has access to the folder, then refresh this page.
            </p>
            <button
              type="button"
              onClick={() => loadDriveVideos()}
              className="text-primary font-medium hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        {!driveVideosLoading && !driveVideosError && driveVideos.length === 0 && sessionStatus === "authenticated" && (
          <p className="text-sm text-gray-500 italic py-2">
            No video files in this folder yet, or they are not shared with the listing account. You can still browse the
            folder on Google Drive.
          </p>
        )}
        {!driveVideosLoading && driveVideos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {driveVideos.map((v) => (
              <div
                key={v.id}
                className="flex flex-col bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-xl overflow-hidden hover:border-primary/40 dark:hover:border-primary/40 transition-colors"
              >
                <div className="px-4 pt-3 pb-2 border-b border-stroke dark:border-dark-3">
                  <h3 className="text-dark dark:text-white font-medium text-sm leading-snug line-clamp-2" title={v.name}>
                    {v.name}
                  </h3>
                </div>
                <div className="relative aspect-video bg-black/5 dark:bg-white/5">
                  <iframe
                    title={v.name}
                    src={v.previewUrl}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="autoplay; fullscreen"
                    loading="lazy"
                  />
                </div>
                <div className="px-4 py-2.5 flex justify-end">
                  <a
                    href={v.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Open in Google Drive
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
        </div>
      )}
    </div>
  );
}