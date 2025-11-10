"use client";
import React, { useState, useMemo } from "react";
import {
  solutionOptions,
  categoryLabels,
  categoryDescriptions,
  SolutionCategory,
} from "./solutions-data";
import SolutionCard from "./SolutionCard";

export default function EnhancedSolutionRangePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    return solutionOptions.filter((s) => {
      const search = searchTerm.toLowerCase();
      return (
        (selectedCategory === "all" || s.category === selectedCategory) &&
        (s.name.toLowerCase().includes(search) ||
          s.description.toLowerCase().includes(search) ||
          categoryLabels[s.category].toLowerCase().includes(search))
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    {/* Enhanced Header with Brand Colors */}
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-5 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent leading-tight">
            Solutions Range
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Comprehensive sustainable solutions driving environmental excellence and operational efficiency
          </p>
        </div>
      </div>
    </header>

      <div className="max-w-7xl mx-auto p-8 space-y-10">
        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Solutions</p>
              <p className="text-3xl font-bold text-gray-900">{totalSolutions}</p>
              <p className="text-xs text-gray-500 mt-1">Active services</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Categories</p>
              <p className="text-3xl font-bold text-gray-900">{totalCategories}</p>
              <p className="text-xs text-gray-500 mt-1">Solution types</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Filtered Results</p>
              <p className="text-3xl font-bold text-gray-900">{filteredCount}</p>
              <p className="text-xs text-gray-500 mt-1">Matching criteria</p>
            </div>
          </div>
        </div>

        {/* Section Intro Divider */}
        <div className="text-center mt-8 mb-2">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">
            Explore by Category
          </h2>
          <p className="text-gray-600 text-sm max-w-2xl mx-auto">
            Select a solution category below to instantly filter the full range of sustainable, AI-powered, and energy-efficient services available through ACES.
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
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
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
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
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
                          {/* ACES Agents Section */}
                          {acesAgents.length > 0 && (
                            <div className="mb-8">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
                                <h3 className="text-lg font-bold text-gray-800">ACES Agents</h3>
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
            <>
              {/* ACES Agents Section */}
              {filtered.filter(s => s.agentType === "aces").length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
                    <h3 className="text-lg font-bold text-gray-800">ACES Agents</h3>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      {filtered.filter(s => s.agentType === "aces").length} agent{filtered.filter(s => s.agentType === "aces").length > 1 ? 's' : ''}
                    </span>
                  </div>
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
                </div>
              )}
              
              {/* Client Agents Section */}
              {filtered.filter(s => s.agentType === "client").length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
                    <h3 className="text-lg font-bold text-gray-800">Client Agents</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {filtered.filter(s => s.agentType === "client").length} agent{filtered.filter(s => s.agentType === "client").length > 1 ? 's' : ''}
                    </span>
                  </div>
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
                </div>
              )}
            </>
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
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}