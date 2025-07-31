"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Define proper types
interface OperatingHours {
  staff: string;
  business: string;
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
  [key: string]: any; // Allow additional properties
}

interface ToggleItem {
  key: string;
  label: string;
}

const SiteProfilingForm = ({ businessName }: { businessName: string }) => {
  const [step, setStep] = useState<string>("site_ownership");
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
                  onClick={() => handleSelect("activity_start", option, "operating_hours")}
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

        {/* Operating Hours */}
        {step === "operating_hours" && renderOperatingHours()}

        {/* Utilities Summary */}
        {step === "utilities_summary" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Utilities Summary</h3>
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-blue-800">
                This section would normally show linked utilities from your business information.
                For this demo, we'll proceed directly to the next section.
              </p>
            </div>
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              onClick={() => setStep("offer_provided")}
            >
              ➡️ Continue to Offer Provided
            </button>
          </div>
        )}

        {/* Offer Provided */}
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

        {/* Communication */}
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

        {/* Community Engagement */}
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

        {/* Refrigeration and Cooling */}
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

        {/* Miscellaneous Equipment */}
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

        {/* Renewable Energy Systems */}
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

        {/* Transportation and Vehicles */}
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

        {/* Waste Management Final */}
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
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                onClick={() => {
                  // Here you would typically submit the data to your backend
                  console.log("Submitting site profiling data:", responses);
                  alert("Site profiling data submitted successfully!");
                }}
              >
                Submit Data
              </button>
              <button
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                onClick={() => {
                  setStep("site_ownership");
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
              >
                Start Over
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
  
  const [businessName, setBusinessName] = useState<string>(urlBusinessName);
  const [startInteractive, setStartInteractive] = useState<boolean>(!!urlBusinessName);

  const handleStartInteractive = () => {
    if (!businessName.trim()) {
      alert("Please enter a business name before starting the questionnaire.");
      return;
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
                />
              </div>
 
              <button
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleStartInteractive}
                disabled={!businessName.trim()}
              >
                Start Interactive Questionnaire
              </button>
            </div>
 
            <div className="text-sm text-gray-500">
              <p>Estimated completion time: 10-15 minutes</p>
            </div>
          </div>
        ) : (
          <SiteProfilingForm businessName={businessName} />
        )}
      </div>
    </div>
  );
 }