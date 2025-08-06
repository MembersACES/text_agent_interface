"use client";
import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/utils";

interface GooglePresentationToolProps {
  token: string;
  initialBusinessInfo?: {
    name?: string;
    abn?: string;
    trading_name?: string;
    email?: string;
    telephone?: string;
    postal_address?: string;
    site_address?: string;
    contact_name?: string;
    position?: string;
    industry?: string;
    website?: string;
    googleDriveLink?: string;
    utilities?: string[];
    targetMarket?: string;
    objectives?: string;
  };
}

interface BusinessSolution {
  id: string;
  name: string;
  description: string;
  category: string;
  slides: string[];
  icon: string;
}

interface CreatedPresentation {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  solutions: string[];
}

const GooglePresentationTool: React.FC<GooglePresentationToolProps> = ({
  token,
  initialBusinessInfo = {},
}) => {
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [presentationTitle, setPresentationTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdPresentations, setCreatedPresentations] = useState<CreatedPresentation[]>([]);
  const [error, setError] = useState<string>("");
  const [businessInfo, setBusinessInfo] = useState({
    businessName: initialBusinessInfo.name || "",
    industry: initialBusinessInfo.industry || "",
    targetMarket: initialBusinessInfo.targetMarket || "",
    objectives: initialBusinessInfo.objectives || ""
  });
  const [contactInfo, setContactInfo] = useState({
    abn: initialBusinessInfo.abn || "",
    tradingAs: initialBusinessInfo.trading_name || "",
    email: initialBusinessInfo.email || "",
    telephone: initialBusinessInfo.telephone || "",
    postalAddress: initialBusinessInfo.postal_address || "",
    siteAddress: initialBusinessInfo.site_address || "",
    contactName: initialBusinessInfo.contact_name || "",
    position: initialBusinessInfo.position || "",
    driveFolder: initialBusinessInfo.googleDriveLink || ""
  });

  // Available business solutions with their corresponding slide templates
  const businessSolutions: BusinessSolution[] = [
    {
      id: "energy_efficiency",
      name: "Energy Efficiency Solutions",
      description: "Reduce energy costs and improve sustainability",
      category: "Sustainability",
      icon: "⚡",
      slides: ["Energy Audit Results", "Cost Savings Analysis", "Implementation Timeline", "ROI Projections"]
    },
    {
      id: "waste_management",
      name: "Waste Management Strategy",
      description: "Optimize waste handling and recycling processes",
      category: "Sustainability",
      icon: "♻️",
      slides: ["Current Waste Analysis", "Reduction Strategies", "Recycling Programs", "Cost Benefits"]
    },
    {
      id: "renewable_energy",
      name: "Renewable Energy Transition",
      description: "Solar, wind and other renewable energy solutions",
      category: "Sustainability",
      icon: "🔋",
      slides: ["Renewable Options", "Installation Plan", "Energy Independence", "Financial Benefits"]
    },
    {
      id: "carbon_offsetting",
      name: "Carbon Offset Programs",
      description: "Achieve carbon neutrality through offset initiatives",
      category: "Sustainability",
      icon: "🌱",
      slides: ["Carbon Footprint Assessment", "Offset Strategies", "Certification Process", "Impact Measurement"]
    },
    {
      id: "supply_chain",
      name: "Supply Chain Optimization",
      description: "Streamline operations and reduce costs",
      category: "Operations",
      icon: "🚚",
      slides: ["Current State Analysis", "Optimization Opportunities", "Implementation Strategy", "Performance Metrics"]
    },
    {
      id: "digital_transformation",
      name: "Digital Transformation",
      description: "Modernize systems and processes",
      category: "Technology",
      icon: "💻",
      slides: ["Digital Assessment", "Technology Roadmap", "Change Management", "Success Metrics"]
    },
    {
      id: "compliance_management",
      name: "Compliance & Regulatory",
      description: "Ensure regulatory compliance and risk management",
      category: "Governance",
      icon: "📋",
      slides: ["Compliance Requirements", "Gap Analysis", "Action Plan", "Monitoring Framework"]
    },
    {
      id: "cost_reduction",
      name: "Cost Reduction Strategy",
      description: "Identify and implement cost-saving opportunities",
      category: "Financial",
      icon: "💰",
      slides: ["Cost Analysis", "Reduction Opportunities", "Implementation Plan", "Savings Tracking"]
    },
    {
      id: "sustainability_reporting",
      name: "Sustainability Reporting",
      description: "ESG reporting and sustainability metrics",
      category: "Sustainability",
      icon: "📊",
      slides: ["ESG Framework", "Data Collection", "Report Structure", "Stakeholder Communication"]
    }
  ];

  // Auto-suggest solutions based on linked utilities
  useEffect(() => {
    if (initialBusinessInfo.utilities && initialBusinessInfo.utilities.length > 0) {
      const utilitySolutionMap: { [key: string]: string[] } = {
        'ELECTRICITY_CI': ['energy_efficiency', 'renewable_energy', 'cost_reduction'],
        'ELECTRICITY_SME': ['energy_efficiency', 'renewable_energy', 'cost_reduction'],
        'GAS_CI': ['energy_efficiency', 'cost_reduction'],
        'GAS_SME': ['energy_efficiency', 'cost_reduction'],
        'WASTE': ['waste_management', 'sustainability_reporting'],
        'COOKING_OIL': ['waste_management', 'sustainability_reporting']
      };

      const suggestedSolutions = new Set<string>();
      initialBusinessInfo.utilities.forEach(utility => {
        const solutions = utilitySolutionMap[utility] || [];
        solutions.forEach(solution => suggestedSolutions.add(solution));
      });

      if (suggestedSolutions.size > 0) {
        setSelectedSolutions(Array.from(suggestedSolutions));
      }
    }
  }, [initialBusinessInfo.utilities]);

  // Auto-generate presentation title based on business info
  useEffect(() => {
    if (businessInfo.businessName && !presentationTitle) {
      const titleSuggestion = `Business Solutions Strategy - ${businessInfo.businessName}`;
      setPresentationTitle(titleSuggestion);
    }
  }, [businessInfo.businessName, presentationTitle]);

  const categories = [...new Set(businessSolutions.map(sol => sol.category))];

  const toggleSolution = (solutionId: string) => {
    setSelectedSolutions(prev => 
      prev.includes(solutionId) 
        ? prev.filter(id => id !== solutionId)
        : [...prev, solutionId]
    );
  };

  const generatePresentation = async () => {
    if (selectedSolutions.length === 0) {
      setError("Please select at least one business solution");
      return;
    }

    if (!presentationTitle.trim()) {
      setError("Please enter a presentation title");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      // Get selected solution details
      const selectedSolutionDetails = businessSolutions.filter(sol => 
        selectedSolutions.includes(sol.id)
      );

      const response = await fetch(`${getApiBaseUrl()}/api/google/generate-solution-presentation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: presentationTitle,
          selected_solutions: selectedSolutionDetails,
          business_info: businessInfo,
          user_token: token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("API Error Response:", result);
        console.error("Response Status:", response.status);
        console.error("Response Headers:", response.headers);
        throw new Error(result.detail || result.error || `HTTP ${response.status}: Failed to generate presentation`);
      }

      // Add the created presentation to our list
      const newPresentation: CreatedPresentation = {
        id: result.presentation_id,
        name: result.title || presentationTitle,
        url: result.url || `https://docs.google.com/presentation/d/${result.presentation_id}/edit`,
        thumbnailUrl: result.thumbnail_url,
        solutions: selectedSolutions
      };

      setCreatedPresentations(prev => [newPresentation, ...prev]);
      
      // Reset form
      setSelectedSolutions([]);
      setPresentationTitle("");
      // Only reset business info if it wasn't pre-populated
      if (!initialBusinessInfo.name) {
        setBusinessInfo({
          businessName: "",
          industry: "",
          targetMarket: "",
          objectives: ""
        });
      }

      // Open the presentation in a new tab
      if (newPresentation.url) {
        window.open(newPresentation.url, "_blank");
      }

    } catch (error: any) {
      console.error("Error generating presentation:", error);
      setError(error.message || "Failed to generate presentation");
    } finally {
      setIsGenerating(false);
    }
  };

  const openPresentation = (url: string) => {
    window.open(url, "_blank");
  };

  const deletePresentation = async (presentationId: string) => {
    if (!confirm("Are you sure you want to delete this presentation?")) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/google/delete-presentation`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          presentation_id: presentationId,
        }),
      });

      if (response.ok) {
        setCreatedPresentations(prev => 
          prev.filter(p => p.id !== presentationId)
        );
      } else {
        throw new Error("Failed to delete presentation");
      }
    } catch (error) {
      console.error("Error deleting presentation:", error);
      setError("Failed to delete presentation");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🎯 Business Solutions Presentation Generator
        </h2>
        <p className="text-gray-600">
          Select the business solutions you want to include and we'll create a comprehensive presentation for your strategy.
        </p>
        {initialBusinessInfo.name && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 text-sm">
              ✅ <strong>Business information pre-loaded:</strong> {initialBusinessInfo.name}
              {initialBusinessInfo.utilities && initialBusinessInfo.utilities.length > 0 && (
                <span className="ml-2">
                  | Solutions auto-suggested based on linked utilities: {initialBusinessInfo.utilities.join(', ')}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Business Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">📝 Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name {initialBusinessInfo.name && <span className="text-green-600">✓ Pre-loaded</span>}
            </label>
            <input
              type="text"
              value={businessInfo.businessName}
              onChange={(e) => setBusinessInfo(prev => ({...prev, businessName: e.target.value}))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry {initialBusinessInfo.industry && <span className="text-green-600">✓ Pre-loaded</span>}
            </label>
            <input
              type="text"
              value={businessInfo.industry}
              onChange={(e) => setBusinessInfo(prev => ({...prev, industry: e.target.value}))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Manufacturing, Retail, Healthcare"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Market
            </label>
            <input
              type="text"
              value={businessInfo.targetMarket}
              onChange={(e) => setBusinessInfo(prev => ({...prev, targetMarket: e.target.value}))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Who are your customers?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Objectives
            </label>
            <input
              type="text"
              value={businessInfo.objectives}
              onChange={(e) => setBusinessInfo(prev => ({...prev, objectives: e.target.value}))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Main business goals"
            />
          </div>
        </div>

        {/* Additional Contact Information (collapsible) */}
        {(contactInfo.abn || contactInfo.email || contactInfo.telephone) && (
          <div className="mt-6 p-4 bg-gray-50 rounded border">
            <h4 className="font-medium text-gray-800 mb-3">📞 Contact Information (Pre-loaded)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {contactInfo.abn && <div><strong>ABN:</strong> {contactInfo.abn}</div>}
              {contactInfo.tradingAs && <div><strong>Trading As:</strong> {contactInfo.tradingAs}</div>}
              {contactInfo.email && <div><strong>Email:</strong> {contactInfo.email}</div>}
              {contactInfo.telephone && <div><strong>Phone:</strong> {contactInfo.telephone}</div>}
              {contactInfo.postalAddress && <div><strong>Address:</strong> {contactInfo.postalAddress}</div>}
              {contactInfo.contactName && <div><strong>Contact:</strong> {contactInfo.contactName}</div>}
              {contactInfo.position && <div><strong>Position:</strong> {contactInfo.position}</div>}
              {contactInfo.driveFolder && (
                <div>
                  <strong>Drive Folder:</strong>{" "}
                  <a href={contactInfo.driveFolder} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    View Folder
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Solution Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          🔧 Select Business Solutions
        </h3>
        <p className="text-gray-600 mb-6">
          Choose the solutions you want to include in your presentation. Each solution will add relevant slides to your deck.
        </p>

        {categories.map(category => (
          <div key={category} className="mb-8">
            <h4 className="text-lg font-medium text-gray-800 mb-3 border-b border-gray-200 pb-1">
              {category}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businessSolutions
                .filter(solution => solution.category === category)
                .map((solution) => (
                <div
                  key={solution.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedSolutions.includes(solution.id)
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                  onClick={() => toggleSolution(solution.id)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{solution.icon}</span>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{solution.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">{solution.description}</p>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Includes slides:</p>
                        <p className="text-xs text-gray-600">{solution.slides.join(", ")}</p>
                      </div>
                    </div>
                    {selectedSolutions.includes(solution.id) && (
                      <span className="text-blue-600 font-bold">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {selectedSolutions.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Selected Solutions ({selectedSolutions.length}):
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedSolutions.map(solutionId => {
                const solution = businessSolutions.find(s => s.id === solutionId);
                return (
                  <span key={solutionId} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {solution?.icon} {solution?.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Presentation Details */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">📋 Presentation Details</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Presentation Title
          </label>
          <input
            type="text"
            value={presentationTitle}
            onChange={(e) => setPresentationTitle(e.target.value)}
            placeholder="e.g., Strategic Business Solutions for [Company Name]"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={generatePresentation}
          disabled={isGenerating || selectedSolutions.length === 0 || !presentationTitle.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Presentation...
            </span>
          ) : (
            "Generate Solutions Presentation"
          )}
        </button>
      </div>

      {/* Created Presentations */}
      {createdPresentations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            📋 Your Presentations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createdPresentations.map((presentation) => (
              <div
                key={presentation.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h4 className="font-medium text-gray-900 mb-2">
                  {presentation.name}
                </h4>
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Solutions included:</p>
                  <div className="flex flex-wrap gap-1">
                    {presentation.solutions.map(solutionId => {
                      const solution = businessSolutions.find(s => s.id === solutionId);
                      return (
                        <span key={solutionId} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {solution?.icon} {solution?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openPresentation(presentation.url)}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    📖 Open Presentation
                  </button>
                  <button
                    onClick={() => deletePresentation(presentation.id)}
                    className="bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-3">💡 How it works:</h4>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Fill in your business information to personalize the presentation</li>
          <li>Select the business solutions relevant to your strategy</li>
          <li>Each solution will add 3-4 specialized slides to your presentation</li>
          <li>Give your presentation a descriptive title</li>
          <li>Click generate to create your custom Google Slides presentation</li>
          <li>The presentation will open automatically and be saved to your Google Drive</li>
        </ol>
      </div>
    </div>
  );
};

export default GooglePresentationTool;