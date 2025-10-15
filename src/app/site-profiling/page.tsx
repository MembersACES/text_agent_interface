"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Define proper types
interface OperatingHours {
  staff: string;
  business: string;
}

interface BusinessInfo {
  name: string;
  address?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  googleDriveLink?: string;
  utilities?: any[];
  [key: string]: any;
}

interface SiteProfilingResponses {
  businessName: string;
  site_ownership?: string;
  number_of_sites?: string;
  staff_members?: string;
  surface_area?: string;
  activity_start?: string;
  operatingHours: {
    [key: string]: OperatingHours;
  };
  offer_provided?: { [key: string]: string };
  communication?: { [key: string]: string };
  community_engagement?: { [key: string]: string };
  refrigeration_cooling?: { [key: string]: string };
  miscellaneous_equipment?: { [key: string]: string };
  renewable_energy_systems?: { [key: string]: string };
  transportation_vehicles?: { [key: string]: string };
  waste_management_final?: { [key: string]: string };
  [key: string]: any;
}

interface ToggleItem {
  key: string;
  label: string;
}

const SiteProfilingForm = ({ 
  businessName, 
  businessInfo 
}: { 
  businessName: string;
  businessInfo: BusinessInfo | null;
}) => {
  const [step, setStep] = useState<string>("site_ownership");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [responses, setResponses] = useState<SiteProfilingResponses>({ 
    businessName,
    operatingHours: {
      monday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
      tuesday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
      wednesday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
      thursday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
      friday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
      saturday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
      sunday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" }
    }
  });
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<'staff' | 'business' | null>(null);
  const [tempHours, setTempHours] = useState<string>("");

  const handleSelect = (field: string, value: string, nextStep: string) => {
    setResponses((prev: SiteProfilingResponses) => ({ ...prev, [field]: value }));
    setStep(nextStep);
  };

  const handleMultiToggle = (section: string, field: string) => {
    setResponses((prev: SiteProfilingResponses) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: prev[section]?.[field] === "Yes" ? "No" : "Yes"
      }
    }));
  };

  const copyMondayToAll = () => {
    const mondayHours = responses.operatingHours.monday;
    const newHours: { [key: string]: OperatingHours } = {};
    ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
      newHours[day] = { ...mondayHours };
    });
    setResponses(prev => ({
      ...prev,
      operatingHours: { ...prev.operatingHours, ...newHours }
    }));
  };

  const saveHours = () => {
    if (editingDay && editingType && tempHours) {
      setResponses(prev => ({
        ...prev,
        operatingHours: {
          ...prev.operatingHours,
          [editingDay]: {
            ...prev.operatingHours[editingDay],
            [editingType]: tempHours
          }
        }
      }));
    }
    setEditingDay(null);
    setEditingType(null);
    setTempHours("");
  };

  const initializeSection = (section: string, defaults: { [key: string]: string }) => {
    if (!responses[section]) {
      setResponses(prev => ({ ...prev, [section]: defaults }));
    }
  };

  // Function to submit data to N8N webhook
  const submitToN8N = async () => {
    setIsSubmitting(true);
    setSubmitStatus("");

    try {
      // Prepare the data in the same format as the backend
      const questionnaireData = {
        site_ownership: responses.site_ownership,
        number_of_sites: responses.number_of_sites,
        staff_members: responses.staff_members,
        surface_area: responses.surface_area,
        activity_start: responses.activity_start,
        years_in_industry: responses.years_in_industry,
        age_range: responses.age_range,
        kitchen_location: responses.kitchen_location,
        kitchen_operation: responses.kitchen_operation,
        cooking_oil_applicable: responses.cooking_oil_applicable,
        operatingHours: responses.operatingHours,
        offer_provided: responses.offer_provided || {},
        communication: responses.communication || {},
        community_engagement: responses.community_engagement || {},
        refrigeration_cooling: responses.refrigeration_cooling || {},
        miscellaneous_equipment: responses.miscellaneous_equipment || {},
        renewable_energy_systems: responses.renewable_energy_systems || {},
        transportation_vehicles: responses.transportation_vehicles || {},
        waste_management_final: responses.waste_management_final || {}
      };

      const webhookData = {
        business_name: businessName,
        business_info: businessInfo || {
          name: businessName,
        },
        questionnaire_data: questionnaireData,
        timestamp: new Date().toISOString(),
        source: "interactive_questionnaire",
        // Include Google Drive link if available
        google_drive_link: businessInfo?.googleDriveLink || null
      };

      console.log("Sending to N8N:", webhookData);

      // Send to the NEW webhook endpoint for interactive questionnaires
      const response = await fetch("https://membersaces.app.n8n.cloud/webhook/new_site_profiling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      });

      if (response.ok) {
        setSubmitStatus("✅ Site profiling data has been successfully processed!");
      } else {
        setSubmitStatus(`⚠️ There was an issue processing the site profiling data. Status code: ${response.status}`);
      }
    } catch (error) {
      console.error("Error submitting to N8N:", error);
      setSubmitStatus(`❌ Error processing site profiling data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize sections with defaults when entering them
  useEffect(() => {
    switch (step) {
      case "offer_provided":
        initializeSection("offer_provided", {
          gaming_machine: "Yes",
          meals: "Yes",
          other: "Yes",
          corporate_events: "Yes"
        });
        break;
      case "communication":
        initializeSection("communication", {
          website: "Yes",
          facebook: "Yes",
          instagram: "No",
          linkedin: "No"
        });
        break;
      case "community_engagement":
        initializeSection("community_engagement", {
          community_engagement: "Yes",
          activity: "Yes",
          action: "Yes",
          other: "Yes"
        });
        break;
      case "refrigeration_cooling":
        initializeSection("refrigeration_cooling", {
          refrigeration: "Yes",
          freezers: "Yes",
          cool_rooms: "Yes",
          hvac: "Yes",
          internal_combustion_engines: "No",
          boilers_furnaces: "No",
          flares: "No",
          turbines: "No",
          process_heaters_ovens: "No",
          incinerators: "No",
          evaporative_cooling: "Yes",
          cooling_systems_natural_gas: "No",
          cooling_systems_chillers: "Yes"
        });
        break;
      case "miscellaneous_equipment":
        initializeSection("miscellaneous_equipment", {
          water_tank: "No",
          communications_switchboard: "Yes",
          power_factor: "No",
          multi_speed_drive: "No",
          generator_on_site: "No"
        });
        break;
      case "renewable_energy_systems":
        initializeSection("renewable_energy_systems", {
          onsite_solar_energy: "Yes",
          onsite_solar_batteries: "No",
          onsite_ev_charger: "Yes",
          ventilation_systems: "Yes",
          heat_exchangers: "No",
          heat_pumps: "No"
        });
        break;
      case "transportation_vehicles":
        initializeSection("transportation_vehicles", {
          passenger_cars: "No",
          vans_pickup_trucks_suvs_diesel: "No",
          heavy_duty_vehicles: "No",
          combination_trucks: "No",
          buses_nonroad_vehicles: "Yes",
          construction_equipment_diesel: "No",
          agricultural_equipment: "No",
          other_nonroad_equipment_waterborne: "No",
          ships_diesel_fuel: "No",
          forklifts: "No"
        });
        break;
      case "waste_management_final":
        initializeSection("waste_management_final", {
          waste_types_general: "Yes",
          waste_types_comingle: "No",
          waste_types_recycle: "Yes",
          waste_types_organic: "Yes",
          grease_trap: "Yes",
          wax_cardboard: "Yes",
          used_cooking_oil: "Yes",
          container_deposit_scheme: "Yes",
          bailer: "No",
          compactor: "No"
        });
        break;
    }
  }, [step]);

  const renderOperatingHours = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Operating Hours</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left">Day</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Staff Operating Hours</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Business Operating Hours</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(responses.operatingHours).map(([day, hours]) => (
              <tr key={day}>
                <td className="border border-gray-300 px-4 py-2 capitalize font-medium">{day}</td>
                <td className="border border-gray-300 px-4 py-2">{hours.staff}</td>
                <td className="border border-gray-300 px-4 py-2">{hours.business}</td>
                <td className="border border-gray-300 px-4 py-2">
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm mr-2"
                    onClick={() => {
                      setEditingDay(day);
                      setEditingType('staff');
                      setTempHours(hours.staff);
                    }}
                  >
                    Edit Staff
                  </button>
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    onClick={() => {
                      setEditingDay(day);
                      setEditingType('business');
                      setTempHours(hours.business);
                    }}
                  >
                    Edit Business
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={copyMondayToAll}
        >
          📋 Copy Monday to All Days
        </button>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={() => setStep("utilities_summary")}
        >
          ✅ Confirm All Hours
        </button>
      </div>

      {editingDay && editingType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">
              Edit {editingDay.charAt(0).toUpperCase() + editingDay.slice(1)} {editingType.charAt(0).toUpperCase() + editingType.slice(1)} Hours
            </h4>
            <p className="text-sm text-gray-600 mb-2">
              Format: HH:MM AM/PM - HH:MM AM/PM (e.g., "8:00 AM - 6:00 PM")
            </p>
            <input
              type="text"
              value={tempHours}
              onChange={(e) => setTempHours(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              placeholder="8:00 AM - 6:00 PM"
            />
            <div className="flex gap-2">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                onClick={saveHours}
              >
                Save
              </button>
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => {
                  setEditingDay(null);
                  setEditingType(null);
                  setTempHours("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderUtilitiesSummary = () => {
    console.log("Business Info in utilities summary:", businessInfo);
    
    // Handle the utilities structure from the business info display
    const utilities = businessInfo?.utilities || {};
    const retailers = businessInfo?.retailers || {};
    
    console.log("Found utilities:", utilities);
    console.log("Found retailers:", retailers);
    
    // Convert the utilities object into an array format for display
    const utilityArray = Object.entries(utilities).map(([type, details]) => {
      let identifiers = [];
      if (typeof details === "string") {
        identifiers = details.split(",").map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(details)) {
        identifiers = details;
      } else {
        identifiers = [String(details)];
      }
      
      // Get retailer info
      const retailerInfo = retailers[type];
      let retailerList = [];
      if (Array.isArray(retailerInfo)) {
        retailerList = retailerInfo;
      } else if (typeof retailerInfo === 'string') {
        retailerList = [retailerInfo];
      }
      
      return {
        type,
        identifiers,
        retailers: retailerList
      };
    }).filter(util => util.identifiers.length > 0);
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Utilities Summary</h3>
        
        {utilityArray.length > 0 ? (
          <div className="space-y-3">
            <p className="text-gray-600">
              The following utilities are linked to your business:
            </p>
            <div className="grid grid-cols-1 gap-3">
              {utilityArray.map((utility, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <div className="font-medium text-blue-800 mb-2">
                    {utility.type}
                  </div>
                  {utility.identifiers.map((identifier, idx) => (
                    <div key={idx} className="text-sm text-blue-600 ml-2">
                      <div>
                        <strong>
                          {utility.type.includes('Electricity') ? 'NMI' : 
                           utility.type.includes('Gas') ? 'MRIN' :
                           utility.type === 'Waste' ? 'Account Number' :
                           utility.type === 'Oil' ? 'Account Name' : 'ID'}:
                        </strong> {identifier}
                      </div>
                      {utility.retailers[idx] && (
                        <div className="text-blue-500">
                          <strong>Retailer:</strong> {utility.retailers[idx]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
            <p className="text-yellow-800">
              No utilities are currently linked to your business. You can add utilities later in your business profile.
            </p>
            {businessInfo && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer">Show available business info fields</summary>
                <pre className="mt-2 bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(Object.keys(businessInfo), null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
        {/* Cooking Oil Applicability */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3">Additional Information</h4>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={responses.cooking_oil_applicable === "Yes"}
              onChange={(e) => setResponses(prev => ({
                ...prev,
                cooking_oil_applicable: e.target.checked ? "Yes" : "No"
              }))}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700">
              This site uses cooking oil (applicable for used cooking oil collection services)
            </span>
          </label>
        </div>
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          onClick={() => setStep("offer_provided")}
        >
          ➡️ Continue to Offer Provided
        </button>
      </div>
    );
  };

  const renderToggleSection = (title: string, sectionKey: string, items: ToggleItem[], nextStep: string) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-gray-600">Click any item to toggle YES/NO, then continue when ready.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(({ key, label }) => {
          const sectionData = responses[sectionKey] as { [key: string]: string } | undefined;
          const isYes = sectionData?.[key] === "Yes";
          return (
            <button
              key={key}
              className={`p-3 rounded border text-left transition-colors ${
                isYes 
                  ? 'bg-green-50 border-green-500 text-green-700' 
                  : 'bg-red-50 border-red-500 text-red-700'
              }`}
              onClick={() => handleMultiToggle(sectionKey, key)}
            >
              <span className="font-medium">
                {isYes ? '✅' : '❌'} {label}: {isYes ? 'YES' : 'NO'}
              </span>
            </button>
          );
        })}
      </div>

      <button
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        onClick={() => setStep(nextStep)}
      >
        ➡️ Continue to Next Section
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Site Profiling Questionnaire</h2>
          <p className="text-gray-600 mt-1">Business: <span className="font-semibold">{businessName}</span></p>
          {businessInfo && (
            <div className="mt-2 text-sm text-gray-500">
              {businessInfo.address && <p>Address: {businessInfo.address}</p>}
              {businessInfo.industry && <p>Industry: {businessInfo.industry}</p>}
            </div>
          )}
        </div>

        {/* Site Ownership */}
        {step === "site_ownership" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Site and Staff Information</h3>
            <p className="text-gray-700">Is the site owned or leased?</p>
            <div className="flex gap-3">
              {["owned", "leased"].map(option => (
                <button
                  key={option}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 capitalize"
                  onClick={() => handleSelect("site_ownership", option, "number_of_sites")}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Number of Sites */}
        {step === "number_of_sites" && (
          <div className="space-y-4">
            <p className="text-gray-700">How many sites are there?</p>
            <div className="flex gap-3 flex-wrap">
              {["1", "2", "3+"].map(option => (
                <button
                  key={option}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  onClick={() => handleSelect("number_of_sites", option, "staff_members")}
                >
                  {option}
                </button>
              ))}
              <button
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                onClick={() => {
                  const custom = prompt("Please enter the number of sites:");
                  if (custom) {
                    handleSelect("number_of_sites", custom, "staff_members");
                  }
                }}
              >
                Other
              </button>
            </div>
          </div>
        )}

        {/* Staff Members */}
        {step === "staff_members" && (
          <div className="space-y-4">
            <p className="text-gray-700">How many staff members are there?</p>
            <div className="flex gap-3 flex-wrap">
              {["1-10", "11-50", "51-100", "100+"].map(option => (
                <button
                  key={option}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  onClick={() => handleSelect("staff_members", option, "surface_area")}
                >
                  {option}
                </button>
              ))}
              <button
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                onClick={() => {
                  const custom = prompt("Please enter the number of staff members:");
                  if (custom) {
                    handleSelect("staff_members", custom, "surface_area");
                  }
                }}
              >
                Other
              </button>
            </div>
          </div>
        )}

        {/* Surface Area */}
        {step === "surface_area" && (
          <div className="space-y-4">
            <p className="text-gray-700">What is the site surface area in m²?</p>
            <div className="flex gap-3 flex-wrap">
              {["<1000", "1000-5000", "5000-10000", "10000+"].map(option => (
                <button
                  key={option}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  onClick={() => handleSelect("surface_area", option, "activity_start")}
                >
                  {option}
                </button>
              ))}
              <button
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                onClick={() => {
                  const custom = prompt("Please enter the site surface area in m²:");
                  if (custom) {
                    handleSelect("surface_area", custom, "activity_start");
                  }
                }}
              >
                Other
              </button>
            </div>
          </div>
        )}

        {/* Activity Start Date */}
        {step === "activity_start" && (
          <div className="space-y-4">
            <p className="text-gray-700">What is the site activity start date?</p>
            <div className="flex gap-3 flex-wrap">
              {["before_2000", "2000-2010", "2010-2020", "after_2020"].map(option => (
                <button
                  key={option}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  onClick={() => handleSelect("activity_start", option, "experience_age")}
                >
                  {option.replace('_', ' ').replace('-', '–')}
                </button>
              ))}
              <button
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                onClick={() => {
                  const custom = prompt("Please enter the site activity start date:");
                  if (custom) {
                    handleSelect("activity_start", custom, "operating_hours");
                  }
                }}
              >
                Other
              </button>
            </div>
          </div>
        )}
        {/* Years in Industry and Age Range */}
        {step === "experience_age" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Decision Maker Information</h3>
            
            {/* Years in Industry */}
            <div className="space-y-3">
              <p className="text-gray-700 font-medium">How many years has the decision-maker been in this industry? *</p>
              <div className="flex gap-3 flex-wrap">
                {["Less than 5 years", "5-10 years", "10-20 years", "20+ years"].map(option => (
                  <button
                    key={option}
                    className={`px-6 py-2 rounded border-2 transition-colors ${
                      responses.years_in_industry === option
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                    onClick={() => setResponses(prev => ({ ...prev, years_in_industry: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Age Range - Optional */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <p className="text-gray-700 font-medium">
                Age range of primary decision-maker? <span className="text-sm text-gray-500">(Optional - helps us tailor recommendations)</span>
              </p>
              <div className="flex gap-3 flex-wrap">
                {["Under 35", "35-45", "45-55", "55-65", "65+", "Prefer not to say"].map(option => (
                  <button
                    key={option}
                    className={`px-6 py-2 rounded border-2 transition-colors ${
                      responses.age_range === option
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                    onClick={() => setResponses(prev => ({ ...prev, age_range: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                You can skip this field if the decision-maker prefers not to share.
              </p>
            </div>
            
            {/* Continue Button - only enabled if years_in_industry is selected */}
            <button
              className={`px-6 py-2 rounded font-medium ${
                responses.years_in_industry
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={() => setStep("kitchen_info")}
              disabled={!responses.years_in_industry}
            >
              ➡️ Continue to Kitchen Information
            </button>
          </div>
        )}
        {/* Kitchen Information */}
        {step === "kitchen_info" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Kitchen Information</h3>
            
            {/* Kitchen Location */}
            <div className="space-y-3">
              <p className="text-gray-700 font-medium">Is the kitchen internal or external?</p>
              <div className="flex gap-3 flex-wrap">
                {["Internal", "External", "Both", "No Kitchen"].map(option => (
                  <button
                    key={option}
                    className={`px-6 py-2 rounded border-2 transition-colors ${
                      responses.kitchen_location === option
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                    onClick={() => setResponses(prev => ({ ...prev, kitchen_location: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Kitchen Operation - Only show if they have a kitchen */}
            {responses.kitchen_location && responses.kitchen_location !== "No Kitchen" && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <p className="text-gray-700 font-medium">Is the kitchen operated in-house or leased?</p>
                <div className="flex gap-3 flex-wrap">
                  {["In-house", "Leased", "Mixed"].map(option => (
                    <button
                      key={option}
                      className={`px-6 py-2 rounded border-2 transition-colors ${
                        responses.kitchen_operation === option
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                      onClick={() => setResponses(prev => ({ ...prev, kitchen_operation: option }))}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              className={`px-6 py-2 rounded font-medium ${
                responses.kitchen_location
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={() => setStep("operating_hours")}
              disabled={!responses.kitchen_location}
            >
              ➡️ Continue to Operating Hours
            </button>
          </div>
        )}
        {/* Operating Hours */}
        {step === "operating_hours" && renderOperatingHours()}

        {/* Utilities Summary */}
        {step === "utilities_summary" && renderUtilitiesSummary()}

        {/* All other sections remain the same */}
        {step === "offer_provided" && renderToggleSection(
          "Offer Provided",
          "offer_provided",
          [
            { key: "gaming_machine", label: "Gaming Machine" },
            { key: "meals", label: "Meals" },
            { key: "other", label: "Other" },
            { key: "corporate_events", label: "Corporate Events" }
          ],
          "communication"
        )}

        {step === "communication" && renderToggleSection(
          "Communication",
          "communication",
          [
            { key: "website", label: "Website" },
            { key: "facebook", label: "Facebook" },
            { key: "instagram", label: "Instagram" },
            { key: "linkedin", label: "LinkedIn" }
          ],
          "community_engagement"
        )}

        {step === "community_engagement" && renderToggleSection(
          "Community Engagement",
          "community_engagement",
          [
            { key: "community_engagement", label: "Community Engagement" },
            { key: "activity", label: "Activity" },
            { key: "action", label: "Action" },
            { key: "other", label: "Other" }
          ],
          "refrigeration_cooling"
        )}

        {step === "refrigeration_cooling" && renderToggleSection(
          "Refrigeration and Cooling",
          "refrigeration_cooling",
          [
            { key: "refrigeration", label: "Refrigeration" },
            { key: "freezers", label: "Freezers" },
            { key: "cool_rooms", label: "Cool rooms" },
            { key: "hvac", label: "HVAC" },
            { key: "internal_combustion_engines", label: "Internal combustion engines" },
            { key: "boilers_furnaces", label: "Boilers/furnaces" },
            { key: "flares", label: "Flares" },
            { key: "turbines", label: "Turbines" },
            { key: "process_heaters_ovens", label: "Process heaters/ovens" },
            { key: "incinerators", label: "Incinerators" },
            { key: "evaporative_cooling", label: "Evaporative Cooling" },
            { key: "cooling_systems_natural_gas", label: "Cooling systems natural gas" },
            { key: "cooling_systems_chillers", label: "Cooling systems chillers" }
          ],
          "miscellaneous_equipment"
        )}

        {step === "miscellaneous_equipment" && renderToggleSection(
          "Miscellaneous Equipment and Facilities",
          "miscellaneous_equipment",
          [
            { key: "water_tank", label: "Water Tank" },
            { key: "communications_switchboard", label: "Communications Switchboard" },
            { key: "power_factor", label: "Power Factor" },
            { key: "multi_speed_drive", label: "Multi-speed Drive" },
            { key: "generator_on_site", label: "Generator on Site" }
          ],
          "renewable_energy_systems"
        )}

        {step === "renewable_energy_systems" && renderToggleSection(
          "Renewable Energy and Systems",
          "renewable_energy_systems",
          [
            { key: "onsite_solar_energy", label: "Onsite Solar Energy" },
            { key: "onsite_solar_batteries", label: "Onsite Solar Batteries" },
            { key: "onsite_ev_charger", label: "Onsite EV Charger" },
            { key: "ventilation_systems", label: "Ventilation Systems" },
            { key: "heat_exchangers", label: "Heat Exchangers" },
            { key: "heat_pumps", label: "Heat Pumps" }
          ],
          "transportation_vehicles"
        )}

        {step === "transportation_vehicles" && renderToggleSection(
          "Transportation and Vehicles",
          "transportation_vehicles",
          [
            { key: "passenger_cars", label: "Passenger Cars" },
            { key: "vans_pickup_trucks_suvs_diesel", label: "Vans, Pickup Trucks & SUVs Diesel Fuel" },
            { key: "heavy_duty_vehicles", label: "Heavy-Duty Vehicles" },
            { key: "combination_trucks", label: "Combination Trucks" },
            { key: "buses_nonroad_vehicles", label: "Buses Nonroad Vehicles" },
            { key: "construction_equipment_diesel", label: "Construction Equipment Diesel Fuel" },
            { key: "agricultural_equipment", label: "Agricultural Equipment" },
            { key: "other_nonroad_equipment_waterborne", label: "Other Nonroad Equipment Waterborne" },
            { key: "ships_diesel_fuel", label: "Ships Diesel Fuel" },
            { key: "forklifts", label: "Forklifts" }
          ],
          "waste_management_final"
        )}

        {step === "waste_management_final" && renderToggleSection(
          "Waste Management",
          "waste_management_final",
          [
            { key: "waste_types_general", label: "Waste Types: General" },
            { key: "waste_types_comingle", label: "Waste Types: Comingle" },
            { key: "waste_types_recycle", label: "Waste Types: Recycle" },
            { key: "waste_types_organic", label: "Waste Types: Organic" },
            { key: "grease_trap", label: "Grease Trap" },
            { key: "wax_cardboard", label: "Wax Cardboard" },
            { key: "used_cooking_oil", label: "Used Cooking Oil" },
            { key: "container_deposit_scheme", label: "Container Deposit Scheme" },
            { key: "bailer", label: "Bailer" },
            { key: "compactor", label: "Compactor" }
          ],
          "complete"
        )}

        {/* Complete */}
        {step === "complete" && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-600 mb-2">🎉 Questionnaire Complete!</h3>
              <p className="text-gray-600">
                Thank you for completing the comprehensive site profiling questionnaire for <strong>{businessName}</strong>!
              </p>
            </div>
            
            {/* Show status message if there is one */}
            {submitStatus && (
              <div className={`p-4 rounded ${
                submitStatus.includes('✅') ? 'bg-green-50 text-green-700' : 
                submitStatus.includes('⚠️') ? 'bg-yellow-50 text-yellow-700' : 
                'bg-red-50 text-red-700'
              }`}>
                {submitStatus}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold mb-2">Summary of Responses:</h4>
              <div className="max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(responses, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className={`px-6 py-2 rounded font-medium ${
                  isSubmitting 
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                onClick={submitToN8N}
                disabled={isSubmitting}
              >
                {isSubmitting ? "🔄 Processing..." : "📤 Submit to N8N"}
              </button>
              <button
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                onClick={() => {
                  setStep("site_ownership");
                  setSubmitStatus("");
                  setResponses({ 
                    businessName,
                    operatingHours: {
                      monday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
                      tuesday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
                      wednesday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
                      thursday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
                      friday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
                      saturday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" },
                      sunday: { staff: "7:30 AM - 11:30 PM", business: "10:00 AM - 11:00 PM" }
                    }
                  });
                }}
                disabled={isSubmitting}
              >
                🔄 Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function SiteProfilingPage() {
  const searchParams = useSearchParams();
  const urlBusinessName = searchParams.get('businessName') || "";
  const urlBusinessInfo = searchParams.get('businessInfo');
  
  const [businessName, setBusinessName] = useState<string>(urlBusinessName);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(
    urlBusinessInfo ? JSON.parse(decodeURIComponent(urlBusinessInfo)) : null
  );
  const [startInteractive, setStartInteractive] = useState<boolean>(!!urlBusinessName);
  const [isLoadingBusinessInfo, setIsLoadingBusinessInfo] = useState<boolean>(false);
  const [businessInfoError, setBusinessInfoError] = useState<string>("");

  // Function to call get business info tool (you'll need to implement this API call)
  const getBusinessInfo = async (businessName: string): Promise<BusinessInfo | null> => {
    try {
      setIsLoadingBusinessInfo(true);
      setBusinessInfoError("");
      
      // Replace this with your actual API call to get business info
      const response = await fetch('/api/get-business-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessName }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.businessInfo || null;
      } else {
        throw new Error(`Failed to fetch business info: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching business info:", error);
      setBusinessInfoError(
        error instanceof Error ? error.message : "Failed to fetch business information"
      );
      return null;
    } finally {
      setIsLoadingBusinessInfo(false);
    }
  };

  const handleStartInteractive = async () => {
    if (!businessName.trim()) {
      alert("Please enter a business name before starting the questionnaire.");
      return;
    }

    // If we don't have business info and this wasn't called from the business info page,
    // try to fetch it
    if (!businessInfo && !urlBusinessInfo) {
      const fetchedBusinessInfo = await getBusinessInfo(businessName);
      if (fetchedBusinessInfo) {
        setBusinessInfo(fetchedBusinessInfo);
      }
    }

    setStartInteractive(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Site Profiling</h1>

        {!startInteractive ? (
          <div className="bg-white border rounded-lg shadow-sm p-8 text-center space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Welcome to the Site Profiling Questionnaire
              </h2>
              <p className="text-gray-600">
                This comprehensive questionnaire will help us understand your business site's characteristics, 
                utilities, equipment, and operations to provide tailored recommendations.
              </p>
            </div>

            {/* Show business info if we have it */}
            {businessInfo && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                <h3 className="font-semibold text-blue-800 mb-2">Business Information Found:</h3>
                <div className="text-left text-sm text-blue-700 space-y-1">
                  <p><strong>Name:</strong> {businessInfo.name}</p>
                  {businessInfo.address && <p><strong>Address:</strong> {businessInfo.address}</p>}
                  {businessInfo.industry && <p><strong>Industry:</strong> {businessInfo.industry}</p>}
                  {businessInfo.utilities && (
                    <p><strong>Utilities:</strong> {businessInfo.utilities.length} linked</p>
                  )}
                </div>
              </div>
            )}

            {/* Show error if business info fetch failed */}
            {businessInfoError && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                <p className="text-yellow-800">
                  <strong>Note:</strong> {businessInfoError}
                  <br />
                  You can still proceed with the questionnaire using just the business name.
                </p>
              </div>
            )}

            <div className="max-w-md mx-auto space-y-4">
              <div className="text-left">
                <label htmlFor="businessName" className="block font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  id="businessName"
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                  disabled={isLoadingBusinessInfo}
                />
              </div>
 
              <button
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleStartInteractive}
                disabled={!businessName.trim() || isLoadingBusinessInfo}
              >
                {isLoadingBusinessInfo ? "🔄 Loading Business Info..." : "Start Interactive Questionnaire"}
              </button>
            </div>
 
            <div className="text-sm text-gray-500">
              <p>Estimated completion time: 10-15 minutes</p>
            </div>
          </div>
        ) : (
          <SiteProfilingForm businessName={businessName} businessInfo={businessInfo} />
        )}
      </div>
    </div>
  );
}