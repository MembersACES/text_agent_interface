
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useToast } from "@/components/ui/toast";
import { Search, Copy, Eye, EyeOff, ExternalLink, Zap, Code2, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Resource {
  name: string;
  link: string;
  password: string;
  notes?: string;
  env: "production" | "development";
  category?: string;
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
    name: "Airtable Integration",
    link: "https://airtable.com/embed/appG1WoHcJt10iO5K/shrr1PYlng8vWqrF1?viewControls=on",
    password: "N/A",
    notes: "Access all Airtable databases (LOA, C&I E, SME E, C&I G, SME G, Waste)",
    env: "production",
    category: "Integration",
  },
];


const CATEGORY_COLORS: Record<string, string> = {
  Platform: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Templates: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Pudu: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Integration: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Interface: "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
};

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
  const isPasswordVisible = visiblePasswords.has(index);
  const isPasswordNA = resource.password === "N/A";
  const hasPassword = resource.password !== "" && resource.password !== "N/A";

  const isValidUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  return (
    <div className="group relative flex flex-col bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-xl p-5 hover:shadow-md hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-200">
      {/* Top row: name + category badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-dark dark:text-white font-semibold text-base leading-tight">
          {resource.name}
        </h3>
        {resource.category && (
          <span
            className={cn(
              "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
              CATEGORY_COLORS[resource.category] ?? "bg-gray-100 text-gray-600"
            )}
          >
            {resource.category}
          </span>
        )}
      </div>

      {/* Notes */}
      {resource.notes ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed flex-1">
          {resource.notes}
        </p>
      ) : (
        <p className="text-sm italic text-gray-300 dark:text-gray-600 mb-4 flex-1">No notes</p>
      )}

      {/* Divider */}
      <div className="border-t border-stroke dark:border-dark-3 pt-3 space-y-2.5">
        {/* Link row */}
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            {isValidUrl(resource.link) ? (
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
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
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
  const [searchTerm, setSearchTerm] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const { showToast } = useToast();

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

  const productionResources = filteredResources.filter((r) => r.env === "production");
  const developmentResources = filteredResources.filter((r) => r.env === "development");

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
        <h1 className="text-heading-3 font-bold text-dark dark:text-white mb-2">Resources</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Central repository for all resource links and credentials
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, category, link, or notes..."
          className="w-full pl-10 pr-10 py-2.5 border border-stroke rounded-xl bg-white dark:bg-gray-dark dark:border-dark-3 text-dark dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Production Section */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-1.5">
            <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Production</span>
          </div>
          <span className="text-sm text-gray-400">
            {productionResources.length} resource{productionResources.length !== 1 ? "s" : ""}
          </span>
        </div>

        {productionResources.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4">No production resources match your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
            <Code2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Development</span>
          </div>
          <span className="text-sm text-gray-400">
            {developmentResources.length} resource{developmentResources.length !== 1 ? "s" : ""}
          </span>
        </div>

        {developmentResources.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4">No development resources match your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
  );
}