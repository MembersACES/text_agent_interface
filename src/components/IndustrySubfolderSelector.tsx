"use client";

import React, { useEffect, useState } from "react";
import {
  fetchIndustryFolders,
  fetchSubfolders,
  type DriveFolderOption,
} from "@/lib/member-folder-api";

interface Props {
  token: string;
  industry: string;
  industryFolderId: string;
  setIndustry: (name: string, folderId: string) => void;
  subfolder: string;
  setSubfolder: (name: string, folderId: string) => void;
  step: number;
}

const IndustrySubfolderSelector: React.FC<Props> = ({
  token,
  industry,
  industryFolderId,
  setIndustry,
  subfolder,
  setSubfolder,
  step,
}) => {
  const [industries, setIndustries] = useState<DriveFolderOption[]>([]);
  const [subfolders, setSubfolders] = useState<DriveFolderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || step !== 4) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchIndustryFolders(token)
      .then((folders) => {
        if (!cancelled) setIndustries(folders);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, step]);

  useEffect(() => {
    if (!token || step !== 5 || !industryFolderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSubfolders(token, industryFolderId)
      .then((folders) => {
        if (!cancelled) setSubfolders(folders);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, step, industryFolderId]);

  const handleIndustryChange = (name: string) => {
    const match = industries.find((f) => f.name === name);
    setIndustry(name, match?.id ?? "");
  };

  const handleSubfolderChange = (name: string) => {
    const match = subfolders.find((f) => f.name === name);
    setSubfolder(name, match?.id ?? "");
  };

  return (
    <div className="space-y-4">
      {step === 4 && (
        <div>
          <label className="block font-medium mb-1">Industry Classification</label>
          <select
            className="w-full border rounded p-2 dark:border-dark-3 dark:bg-dark-2"
            value={industry}
            onChange={(e) => handleIndustryChange(e.target.value)}
            disabled={loading}
          >
            <option value="">{loading ? "Loading folders…" : "Select industry..."}</option>
            {industries.map((opt) => (
              <option key={opt.id} value={opt.name}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {step === 5 && industry && (
        <div>
          <label className="block font-medium mb-1">Subfolder (State/Classification)</label>
          <select
            className="w-full border rounded p-2 dark:border-dark-3 dark:bg-dark-2"
            value={subfolder}
            onChange={(e) => handleSubfolderChange(e.target.value)}
            disabled={loading}
          >
            <option value="">{loading ? "Loading subfolders…" : "Select subfolder..."}</option>
            {subfolders.map((opt) => (
              <option key={opt.id} value={opt.name}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default IndustrySubfolderSelector;
