"use client";
import React from "react";
import { useSession } from "next-auth/react"; // Add this import
import CanvaPitchDeckTool from "@/components/CanvaPitchDeckTool";

export default function CanvaPitchDeckPage() {
  const { data: session } = useSession(); // Get session
  const token = (session as any)?.id_token || (session as any)?.accessToken; // Your token logic

  const handleConnect = async () => {
    window.location.href = "/api/canva/oauth-start";
  };

  // Show loading or login prompt if no token
  if (!token) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Please log in to use this feature.
        </div>
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-indigo-600 text-white rounded mb-4"
        >
          Connect to Canva
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={handleConnect}
        className="px-4 py-2 bg-indigo-600 text-white rounded mb-4"
      >
        Connect to Canva
      </button>
      
      <CanvaPitchDeckTool token={token} />
    </div>
  );
}