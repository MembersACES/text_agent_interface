"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useToast } from "@/components/ui/toast";
import { Search, Copy, Eye, EyeOff, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Resource {
  name: string;
  link: string;
  password: string;
  notes?: string;
}

const RESOURCES: Resource[] = [
  {
    name: "ACES Demo",
    link: "https://acesdemo-672026052958.australia-southeast2.run.app/",
    password: "ACES_demo1@!",
    notes: "ACES Demo is a demo of the Aces Solutions platform. It is used to test the platform and the features of the platform.",
  },
  {
    name: "ACES Automation Hub",
    link: "https://aces-automation-hub-672026052958.australia-southeast2.run.app/",
    password: "ACES_auto_Hub1!",
    notes: "ACES Automation Hub is a platform for automating the Aces Solutions platform. It is used to test the platform and the features of the platform.",
  },
  {
    name: "Text Agent Templates",
    link: "https://text-agent-template-672026052958.australia-southeast2.run.app",
    password: "CZA12!",
    notes: "Text Agent Templates is a platform for creating and testing text agents. It is used to test the platform and the features of the platform.",
  },
  {
    name: "Text Agent Templates Dev",
    link: "https://text-agent-template-dev-672026052958.australia-southeast2.run.app",
    password: "ACESmultiagent1!@",
    notes: "Text Agent Templates Dev is a platform for creating and testing text agents. It is used to test the platform and the features of the platform.",
  },
  {
    name: "Interface Development",
    link: "https://acesagentinterfacedev-672026052958.australia-southeast2.run.app",
    password: "N/A",
    notes: "Interface Development is a platform for developing and testing interface development. It is used to test the platform and the features of the platform.",
  },
  {
    name: "Pudu Maintenance English",
    link: "https://pudu-chatbot-english-672026052958.australia-southeast2.run.app/",
    password: "Bot_Maintenance_Agent!1",
    notes: "",
  },
  {
    name: "Pudu Multilanguage",
    link: "https://pudu-chatbot-672026052958.australia-southeast2.run.app/",
    password: "PuduAgent1!2@!",
    notes: "",
  },
  {
    name: "Airtable Integration",
    link: "https://airtable.com/embed/appG1WoHcJt10iO5K/shrr1PYlng8vWqrF1?viewControls=on",
    password: "N/A",
    notes: "Access all Airtable databases (LOA, C&I E, SME E, C&I G, SME G, Waste)",
  },
];

export default function ResourcesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  // Passwords are hidden by default - store visible passwords instead
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const { showToast } = useToast();

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const filteredResources = useMemo(() => {
    if (!searchTerm) return RESOURCES;
    const search = searchTerm.toLowerCase();
    return RESOURCES.filter(
      (resource) =>
        resource.name.toLowerCase().includes(search) ||
        resource.link.toLowerCase().includes(search) ||
        resource.notes?.toLowerCase().includes(search) ||
        resource.password.toLowerCase().includes(search)
    );
  }, [searchTerm]);

  const togglePasswordVisibility = (index: number) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${type} copied to clipboard`, "success");
    } catch (err) {
      showToast("Failed to copy to clipboard", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div>
        <h1 className="text-heading-3 font-bold text-dark dark:text-white mb-2">
          Resources
        </h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Central repository for all resource links and notes
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resources by name, link, password, or notes..."
              className="w-full pl-10 pr-4 py-2.5 border border-stroke rounded-lg bg-white dark:bg-gray-dark dark:border-dark-3 text-dark dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="text-sm">Clear</span>
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Found {filteredResources.length} result{filteredResources.length !== 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resources Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Links</CardTitle>
          <CardDescription>
            {filteredResources.length} resource{filteredResources.length !== 1 ? "s" : ""} available
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-none bg-gray-50 dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:font-semibold [&>th]:text-dark [&>th]:dark:text-white">
                  <TableHead className="min-w-[200px] xl:pl-7.5">
                    Resource Name
                  </TableHead>
                  <TableHead className="min-w-[300px]">Link</TableHead>
                  <TableHead className="min-w-[200px]">Password</TableHead>
                  <TableHead className="min-w-[250px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-600 dark:text-gray-400 font-medium">
                          No resources found
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          Try adjusting your search criteria
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResources.map((resource, index) => {
                    const isPasswordVisible = visiblePasswords.has(index);
                    const isPasswordNA = resource.password === "N/A";

                    return (
                      <TableRow
                        key={index}
                        className="border-stroke dark:border-dark-3 hover:bg-gray-50 dark:hover:bg-dark-2 transition-colors"
                      >
                        <TableCell className="min-w-[200px] xl:pl-7.5">
                          <h5 className="text-dark dark:text-white font-medium">
                            {resource.name}
                          </h5>
                        </TableCell>
                        <TableCell className="min-w-[300px]">
                          <div className="flex items-center gap-2">
                            {isValidUrl(resource.link) ? (
                              <>
                                <a
                                  href={resource.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline break-all flex items-center gap-1"
                                >
                                  {resource.link}
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                                <button
                                  onClick={() => copyToClipboard(resource.link, "Link")}
                                  className="ml-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors"
                                  title="Copy link"
                                >
                                  <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </button>
                              </>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400 break-all">
                                {resource.link}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-mono text-sm px-2 py-1 rounded border",
                                isPasswordNA
                                  ? "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-dark-2 border-gray-200 dark:border-dark-3"
                                  : "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-dark-2 border-gray-200 dark:border-dark-3"
                              )}
                            >
                              {isPasswordNA
                                ? "N/A"
                                : isPasswordVisible
                                ? resource.password
                                : "••••••••"}
                            </span>
                            {!isPasswordNA && (
                              <>
                                <button
                                  onClick={() => togglePasswordVisibility(index)}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors"
                                  title={isPasswordVisible ? "Hide password" : "Show password"}
                                >
                                  {isPasswordVisible ? (
                                    <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(resource.password, "Password")}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-3 transition-colors"
                                  title="Copy password"
                                >
                                  <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[250px]">
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {resource.notes || (
                              <span className="italic text-gray-400 dark:text-gray-500">
                                No notes
                              </span>
                            )}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
