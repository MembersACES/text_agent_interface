"use client";
import React, { useState, useMemo } from "react";
import {
  solutionOptions,
  categoryLabels,
  categoryDescriptions,
  SolutionCategory,
} from "./solutions-data";
import SolutionCard from "./SolutionCard";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { StatCard } from "@/components/dashboard";
import { Sparkles, Layers, Filter } from "lucide-react";

export default function EnhancedSolutionRangePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedAgentSections, setExpandedAgentSections] = useState<{ aces: boolean; client: boolean }>({ aces: false, client: false });

  const filtered = useMemo(() => {
    return solutionOptions.filter((s) => {
      if (!s.enabled) return false;
      const search = searchTerm.toLowerCase();
      return (
        (selectedCategory === "all" || s.category === selectedCategory) &&
        (s.name.toLowerCase().includes(search) ||
          s.description.toLowerCase().includes(search) ||
          categoryLabels[s.category].toLowerCase().includes(search) ||
          (s.agentCapabilities?.some(cap => cap.toLowerCase().includes(search)) ?? false))
      );
    });
  }, [searchTerm, selectedCategory]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, s) => {
      (acc[s.category] ||= []).push(s);
      return acc;
    }, {} as Record<string, typeof solutionOptions>);
  }, [filtered]);

  const totalSolutions = solutionOptions.length;
  const totalCategories = Object.keys(categoryLabels).length;
  const filteredCount = filtered.length;

  return (
    <div className="space-y-8">
      <PageHeader
        pageName="Solution Range"
        description="Comprehensive sustainable solutions driving environmental excellence and operational efficiency."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total solutions" value={totalSolutions} icon={<Sparkles />} accent="primary" />
        <StatCard label="Categories" value={totalCategories} icon={<Layers />} accent="scope-2" />
        <StatCard label="Showing" value={filteredCount} trend={`${filtered.length} match filters`} icon={<Filter />} accent="scope-3" />
      </div>

      <div className="space-y-10">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search solutions by name, description, or category..."
              className="w-full px-4 py-3 pl-10 pr-10 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              Found {filteredCount} result{filteredCount !== 1 ? 's' : ''}
              {selectedCategory !== "all" && (
                <span> in {categoryLabels[selectedCategory as SolutionCategory]}</span>
              )}
            </div>
          )}
        </div>

        {/* Section Intro Divider */}
        <div className="text-center mt-8 mb-2">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">
            Explore by Category
          </h2>
          <p className="text-gray-600 text-sm max-w-2xl mx-auto">
            Select a solution category below to instantly filter the full range of sustainable, AI-powered, and energy-efficient services available through Carbon Zero Australasia.
          </p>
        </div>

        {/* Quick Category Overview - Two Rows */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          {[
            "profile_reset",
            "resource_recovery",
            "asset_optimisation",
            ...Object.keys(categoryLabels).filter(
              (k) => !["profile_reset", "resource_recovery", "asset_optimisation"].includes(k)
            ),
          ].map((key) => (
            <button
              key={key}
              onClick={() =>
                setSelectedCategory((prev) => (prev === key ? "all" : key))
              }
              className={`px-5 py-3 rounded-xl text-sm font-medium border transition-all text-center shadow-sm ${
                selectedCategory === key
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-white text-gray-700 hover:bg-blue-50 border-gray-200"
              }`}
            >
              {categoryLabels[key as keyof typeof categoryLabels] || key}
              <p className="text-xs mt-1 text-gray-500">
                {grouped[key]?.length || 0} solution{(grouped[key]?.length || 0) > 1 && "s"}
              </p>
            </button>
          ))}
        </div>

        {/* Solutions Display */}
        {selectedCategory === "all" ? (
          // Categorized View
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, items]) => {
              const expanded = expandedCategories.includes(category);
              const isAiAutomation = category === "ai_automation";
              const acesAgents = isAiAutomation ? items.filter(s => s.agentType === "aces") : [];
              const clientAgents = isAiAutomation ? items.filter(s => s.agentType === "client") : [];
              
              return (
                <div
                  key={category}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() =>
                      setExpandedCategories((prev) =>
                        expanded
                          ? prev.filter((c) => c !== category)
                          : [...prev, category]
                      )
                    }
                    className="w-full flex justify-between items-center px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border-b transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${
                        category === "platform" ? "from-green-400 to-green-600" :
                        category === "ai_bots" ? "from-blue-400 to-blue-600" :
                        category === "renewable_energy" ? "from-yellow-400 to-orange-600" :
                        category === "resource_recovery" ? "from-teal-400 to-cyan-600" :
                        category === "client_automation" ? "from-violet-400 to-purple-600" :
                        "from-purple-400 to-purple-600"
                      }`}></div>
                      <h2 className="font-bold text-lg text-gray-800">
                        {categoryLabels[category as SolutionCategory]}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm bg-blue-100 px-3 py-1 rounded-full text-blue-700 font-medium">
                        {items.length} solution{items.length > 1 && "s"}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {expanded && (
                    <div className="p-6">
                      <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                        {categoryDescriptions[category as SolutionCategory]}
                      </p>
                      
                      {isAiAutomation ? (
                        <>
                          {/* Carbon Zero Agents Section */}
                          {acesAgents.length > 0 && (
                            <div className="mb-8">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
                                <h3 className="text-lg font-bold text-gray-800">Carbon Zero Agents</h3>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                                  {acesAgents.length} agent{acesAgents.length > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {acesAgents.map((s) => (
                                  <div key={s.id}>
                                    <SolutionCard solution={s} />
                                    {s.subSolutions && s.subSolutions.length > 0 && (
                                      <div className="mt-5 ml-6 pl-6 border-l-2 border-blue-100">
                                        <button
                                          onClick={() =>
                                            setExpandedCategories((prev) =>
                                              prev.includes(s.id)
                                                ? prev.filter((c) => c !== s.id)
                                                : [...prev, s.id]
                                            )
                                          }
                                          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-all"
                                        >
                                          <div className="flex items-center gap-2">
                                            <svg
                                              className="w-4 h-4 text-blue-500"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                              />
                                            </svg>
                                            <span className="text-blue-600">Linked AI Agents</span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                              {s.subSolutions.length}
                                            </span>
                                          </div>
                                          <svg
                                            className={`w-5 h-5 text-gray-400 transition-transform ${
                                              expandedCategories.includes(s.id) ? "rotate-90" : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M9 5l7 7-7 7"
                                            />
                                          </svg>
                                        </button>

                                        {expandedCategories.includes(s.id) && (
                                          <div className="relative space-y-4 mt-2">
                                            <div className="absolute -left-[6px] top-3 w-3 h-3 bg-blue-400 rounded-full shadow-sm"></div>
                                            {s.subSolutions.map((sub) => (
                                              <div
                                                key={sub.id}
                                                className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                                              >
                                                <div className="p-4">
                                                  <SolutionCard solution={sub} />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Client Agents Section */}
                          {clientAgents.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
                                <h3 className="text-lg font-bold text-gray-800">Client Agents</h3>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                  {clientAgents.length} agent{clientAgents.length > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {clientAgents.map((s) => (
                                  <div key={s.id}>
                                    <SolutionCard solution={s} />
                                    {s.subSolutions && s.subSolutions.length > 0 && (
                                      <div className="mt-5 ml-6 pl-6 border-l-2 border-blue-100">
                                        <button
                                          onClick={() =>
                                            setExpandedCategories((prev) =>
                                              prev.includes(s.id)
                                                ? prev.filter((c) => c !== s.id)
                                                : [...prev, s.id]
                                            )
                                          }
                                          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-all"
                                        >
                                          <div className="flex items-center gap-2">
                                            <svg
                                              className="w-4 h-4 text-blue-500"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                              />
                                            </svg>
                                            <span className="text-blue-600">Linked AI Agents</span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                              {s.subSolutions.length}
                                            </span>
                                          </div>
                                          <svg
                                            className={`w-5 h-5 text-gray-400 transition-transform ${
                                              expandedCategories.includes(s.id) ? "rotate-90" : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M9 5l7 7-7 7"
                                            />
                                          </svg>
                                        </button>

                                        {expandedCategories.includes(s.id) && (
                                          <div className="relative space-y-4 mt-2">
                                            <div className="absolute -left-[6px] top-3 w-3 h-3 bg-blue-400 rounded-full shadow-sm"></div>
                                            {s.subSolutions.map((sub) => (
                                              <div
                                                key={sub.id}
                                                className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                                              >
                                                <div className="p-4">
                                                  <SolutionCard solution={sub} />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-3"}>
                          {items.map((s) => (
                            <div key={s.id}>
                              <SolutionCard solution={s} />
                              {s.subSolutions && s.subSolutions.length > 0 && (
                                <div className="mt-5 ml-6 pl-6 border-l-2 border-blue-100">
                                  <button
                                    onClick={() =>
                                      setExpandedCategories((prev) =>
                                        prev.includes(s.id)
                                          ? prev.filter((c) => c !== s.id)
                                          : [...prev, s.id]
                                      )
                                    }
                                    className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-all"
                                  >
                                    <div className="flex items-center gap-2">
                                      <svg
                                        className="w-4 h-4 text-blue-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 5l7 7-7 7"
                                        />
                                      </svg>
                                      <span className="text-blue-600">Linked AI Agents</span>
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {s.subSolutions.length}
                                      </span>
                                    </div>
                                    <svg
                                      className={`w-5 h-5 text-gray-400 transition-transform ${
                                        expandedCategories.includes(s.id) ? "rotate-90" : ""
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                  </button>

                                  {expandedCategories.includes(s.id) && (
                                    <div className="relative space-y-4 mt-2">
                                      <div className="absolute -left-[6px] top-3 w-3 h-3 bg-blue-400 rounded-full shadow-sm"></div>
                                      {s.subSolutions.map((sub) => (
                                        <div
                                          key={sub.id}
                                          className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                                        >
                                          <div className="p-4">
                                            <SolutionCard solution={sub} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      ) : (
        // Direct View (filtered category)
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {categoryLabels[selectedCategory as SolutionCategory]}
            </h2>
            <p className="text-sm text-gray-600">
              {categoryDescriptions[selectedCategory as SolutionCategory]}
            </p>
          </div>
          
          {selectedCategory === "ai_automation" ? (
            <div className="space-y-6">
              {/* Carbon Zero Agents Section */}
              {selectedCategory === "ai_automation" && filtered.filter(s => s.agentType === "aces").length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedAgentSections(prev => ({ ...prev, aces: !prev.aces }))}
                    className="w-full flex items-center justify-between gap-2 mb-4 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
                      <h3 className="text-lg font-bold text-gray-800">Carbon Zero Agents</h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                        {filtered.filter(s => s.agentType === "aces").length} agent{filtered.filter(s => s.agentType === "aces").length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedAgentSections.aces ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedAgentSections.aces && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.filter(s => s.agentType === "aces").map((s) => (
                      <div key={s.id}>
                        <SolutionCard solution={s} />
                        {s.subSolutions && s.subSolutions.length > 0 && (
                          <div className="mt-5 ml-6 pl-6 border-l-2 border-blue-100">
                            <button
                              onClick={() =>
                                setExpandedCategories((prev) =>
                                  prev.includes(s.id)
                                    ? prev.filter((c) => c !== s.id)
                                    : [...prev, s.id]
                                )
                              }
                              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-blue-600">Linked AI Agents</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {s.subSolutions.length}
                                </span>
                              </div>
                              <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedCategories.includes(s.id) ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            {expandedCategories.includes(s.id) && (
                              <div className="relative space-y-4 mt-2">
                                <div className="absolute -left-[6px] top-3 w-3 h-3 bg-blue-400 rounded-full shadow-sm"></div>
                                {s.subSolutions.map((sub) => (
                                  <div key={sub.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                                    <div className="p-4">
                                      <SolutionCard solution={sub} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}
              
              {/* Client Agents Section */}
              {selectedCategory === "ai_automation" && filtered.filter(s => s.agentType === "client").length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedAgentSections(prev => ({ ...prev, client: !prev.client }))}
                    className="w-full flex items-center justify-between gap-2 mb-4 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
                      <h3 className="text-lg font-bold text-gray-800">Client Agents</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        {filtered.filter(s => s.agentType === "client").length} agent{filtered.filter(s => s.agentType === "client").length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedAgentSections.client ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedAgentSections.client && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.filter(s => s.agentType === "client").map((s) => (
                      <div key={s.id}>
                        <SolutionCard solution={s} />
                        {s.subSolutions && s.subSolutions.length > 0 && (
                          <div className="mt-5 ml-6 pl-6 border-l-2 border-blue-100">
                            <button
                              onClick={() =>
                                setExpandedCategories((prev) =>
                                  prev.includes(s.id)
                                    ? prev.filter((c) => c !== s.id)
                                    : [...prev, s.id]
                                )
                              }
                              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-blue-600">Linked AI Agents</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {s.subSolutions.length}
                                </span>
                              </div>
                              <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedCategories.includes(s.id) ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            {expandedCategories.includes(s.id) && (
                              <div className="relative space-y-4 mt-2">
                                <div className="absolute -left-[6px] top-3 w-3 h-3 bg-blue-400 rounded-full shadow-sm"></div>
                                {s.subSolutions.map((sub) => (
                                  <div key={sub.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                                    <div className="p-4">
                                      <SolutionCard solution={sub} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-3"}>
              {filtered.map((s) => (
              <div key={s.id}>
                <SolutionCard solution={s} />
                {s.subSolutions && s.subSolutions.length > 0 && (
                  <div className="mt-5 ml-6 pl-6 border-l-2 border-blue-100">
                    <button
                      onClick={() =>
                        setExpandedCategories((prev) =>
                          prev.includes(s.id)
                            ? prev.filter((c) => c !== s.id)
                            : [...prev, s.id]
                        )
                      }
                      className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <span className="text-blue-600">Linked AI Agents</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {s.subSolutions.length}
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedCategories.includes(s.id) ? "rotate-90" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    {expandedCategories.includes(s.id) && (
                      <div className="relative space-y-4 mt-2">
                        <div className="absolute -left-[6px] top-3 w-3 h-3 bg-blue-400 rounded-full shadow-sm"></div>
                        {s.subSolutions.map((sub) => (
                          <div
                            key={sub.id}
                            className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                          >
                            <div className="p-4">
                              <SolutionCard solution={sub} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))}
            </div>
          )}
          </div>
        )}

        {/* No Results Message */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No solutions found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or browse all categories</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}