"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Resource {
  name: string;
  link: string;
  password: string;
  notes?: string;
}

const RESOURCES: Resource[] = [
    {
        name: "ACES Demo",
        link: "PLACEHOLDER LINK",
        password: "PLACEHOLDER",
        notes: "",
      },
    {
    name: "Pudu Maintenance English",
    link: "https://pudu-chatbot-english-672026052958.australia-southeast2.run.app/",
    password: "Bot_Maintenance_Agent!",
    notes: "",
  },
  {
    name: "Pudu Multilanguage",
    link: "https://pudu-chatbot-672026052958.australia-southeast2.run.app/",
    password: "PuduAgent1!2@",
    notes: "",
  },
];

export default function ResourcesPage() {
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark dark:text-white mb-2">
          Resources
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Central repository for all resource links and notes
        </p>
      </div>

      {/* Resources Table */}
      <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
              <TableHead className="min-w-[200px] xl:pl-7.5">
                Resource Name
              </TableHead>
              <TableHead className="min-w-[300px]">Link</TableHead>
              <TableHead className="min-w-[150px]">Password</TableHead>
              <TableHead className="min-w-[250px]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RESOURCES.map((resource, index) => (
              <TableRow
                key={index}
                className="border-[#eee] dark:border-dark-3"
              >
                <TableCell className="min-w-[200px] xl:pl-7.5">
                  <h5 className="text-dark dark:text-white font-medium">
                    {resource.name}
                  </h5>
                </TableCell>
                <TableCell className="min-w-[300px]">
                  {isValidUrl(resource.link) ? (
                    <a
                      href={resource.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {resource.link}
                    </a>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 break-all">
                      {resource.link}
                    </span>
                  )}
                </TableCell>
                <TableCell className="min-w-[150px]">
                  <span className="font-mono text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-dark-2 px-2 py-1 rounded border border-gray-200 dark:border-dark-3">
                    {resource.password}
                  </span>
                </TableCell>
                <TableCell className="min-w-[250px]">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {resource.notes || (
                      <span className="italic text-gray-400">No notes</span>
                    )}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
