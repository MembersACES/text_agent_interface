"use client";
import React from "react";
import CanvaPitchDeckTool from "@/components/CanvaPitchDeckTool";

export default function CanvaPitchDeckPage() {
  const handleConnect = async () => {
    window.location.href = "/api/canva/oauth-start";
  };

  return (
    <div className="p-6">
      <button
        onClick={handleConnect}
        className="px-4 py-2 bg-indigo-600 text-white rounded mb-4"
      >
        Connect to Canva
      </button>
      
      <CanvaPitchDeckTool token="" />
    </div>
  );
}