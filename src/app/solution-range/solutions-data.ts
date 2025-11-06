// src/app/solution-range/solutions-data.ts

export type SolutionCategory =
  | "platform"
  | "ai_bots"
  | "ai_automation"
  | "referral"
  | "profile_reset"
  | "renewable_energy"
  | "resource_recovery"
  | "asset_optimisation"
  | "other_solutions"
  | "ghg";

export interface SolutionOption {
  id: string;
  name: string;
  description: string;
  presentationId: string;
  enabled: boolean;
  category: SolutionCategory;
  imageUrl?: string;
  phoneNumber?: string;
  agentCapabilities?: string[];
}

export const categoryLabels: Record<SolutionCategory, string> = {
  platform: "🌱 Sustainable Platform",
  ai_bots: "🤖 AI Cleaning Bots",
  ai_automation: "📞 Digital Voice Agents",
  referral: "📅 Event Referral",
  profile_reset: "🔄 Profile Reset",
  renewable_energy: "☀️ Renewable Energy",
  resource_recovery: "♻️ Resource Recovery",
  asset_optimisation: "📈 Asset Optimisation",
  other_solutions: "🔧 Other Solutions",
  ghg: "🌍 GHG",
};

export const categoryDescriptions: Record<SolutionCategory, string> = {
  platform:
    "Comprehensive sustainable platform solutions integrating multiple sustainability initiatives into a unified system.",
  ai_bots:
    "Intelligent AI-powered robotic solutions for automated cleaning and maintenance tasks.",
  ai_automation:
    "AI-powered voice and digital agents that handle customer interactions and scheduling 24/7.",
  referral:
    "Strategic event referral programs and management systems for business growth.",
  profile_reset:
    "Comprehensive review and optimization of utility profiles, consumption, and waste systems.",
  renewable_energy:
    "Solar and renewable energy solutions from rooftops to large-scale farms.",
  resource_recovery:
    "Waste recovery, recycling, and resource management across multiple waste streams.",
  asset_optimisation:
    "Optimization of assets via demand response, government incentives, and carbon programs.",
  other_solutions:
    "Specialized infrastructure improvements such as backup power and energy-efficient refrigeration.",
  ghg:
    "Greenhouse gas reporting and compliance solutions for tracking and reducing carbon footprint.",
};

export const solutionOptions: SolutionOption[] = [
  {
    id: "sustainable_platforms",
    name: "Sustainable Platforms",
    description: "Comprehensive sustainable platform solutions using generic branding template",
    presentationId: "1jedCYkRGH3jXo29eg4BLdZq_vf9g1qSlkjMstMa_xYU",
    enabled: true,
    category: "platform",
    imageUrl: "/solutions/sustainable-platform.png"
  },

  {
    id: "assisted_scrubber",
    name: "Assisted Scrubber (CS)",
    description: "AI-powered assisted scrubbing solutions for automated cleaning",
    presentationId: "1VqfPbIWfHwx11fXFfi8Z5qq0-AzgvMzooM1fV-FWtGs",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/assisted-scrubber.png"
  },
  {
    id: "scrubber_ai_bot",
    name: "Scrubber-Assisted AI Bot (SH1)",
    description: "Advanced AI bot for intelligent scrubbing operations",
    presentationId: "1c0s191tvwa1ZenWPG5Ghdo5J4c0SPf3GbbjtDPO5lXE",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/scrubber-bot.png"
  },
  {
    id: "vacuum_mopping_ai_bot",
    name: "Vacuum-Mopping AI Bot (CC1)",
    description: "Comprehensive vacuum and mopping AI bot system",
    presentationId: "1DCNrBY1AA-B4OLuMFIXvEhkN-rTA287J1TbESkD-3ts",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/vacuum-mopping-bot.png"
  },
  {
    id: "engagement_bot",
    name: "Customer Engagement Bot",
    description: "AI-powered customer engagement and interaction bot",
    presentationId: "1W3SbzwNFyIoNCCoj_SFAULVHZT1pflNE031QF9dII8U",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/engagement-bot.png"
  },
  {
    id: "filtering_cleaning_bot",
    name: "Oil Filtering & Cleaning Assisted Unit",
    description: "Advanced filtering and cleaning assistance through AI automation",
    presentationId: "10srsHl936u9unxOE30EyGQKmsQU4XEpGbQcBhOG8_Gc",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/oil-filtering-bot.png"
  },

  {
    id: "phone_agent",
    name: "Phone Agent",
    description: "AI-powered phone agent for automated customer service and support",
    presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8",
    enabled: true,
    category: "ai_automation",
    imageUrl: "/solutions/phone-agent.png",
    phoneNumber: "+61 3 XXXX XXXX",
    agentCapabilities: [
      "Answer general inquiries",
      "Route calls to appropriate departments",
      "Provide business information",
      "Schedule callbacks",
      "24/7 availability"
    ]
  },
  {
    id: "booking_digital_receptionist",
    name: "Booking Digital Receptionist",
    description: "Digital receptionist system for automated booking and appointment management",
    presentationId: "1e3RfOAVz0ugegwSBUR2z8uVzqsQpFADgI1ZOgdK1sUY",
    enabled: true,
    category: "ai_automation",
    imageUrl: "/solutions/digital-receptionist.png",
    phoneNumber: "+61 3 YYYY YYYY",
    agentCapabilities: [
      "Schedule appointments",
      "Manage bookings",
      "Send confirmations",
      "Handle reschedules",
      "Appointment reminders"
    ]
  },

  {
    id: "event_referral",
    name: "Event Referral Program",
    description: "Comprehensive event referral and management system",
    presentationId: "1Jqi5pMRv0amYqMiPysc_hFi03vNorKio3A5fcRUluOc",
    enabled: true,
    category: "referral",
    imageUrl: "/solutions/event-referral.png"
  },

  {
    id: "electricity_ci_sme_align",
    name: "Electricity C&I & SME Align Forward",
    description: "Commercial & Industrial and SME electricity alignment solutions",
    presentationId: "1im1Yl0AzuzJULk4_crwV1W7nOQV9XF7CvzRpkjRQV34",
    enabled: true,
    category: "profile_reset",
    imageUrl: "/solutions/electricity-align.png"
  },
  {
    id: "electricity_gas_discrepancy",
    name: "Electricity & Gas Discrepancy Review",
    description: "Comprehensive review and analysis of electricity and gas discrepancies",
    presentationId: "1EC3SncEMHfaIoofzJTWKnPhEaa6w6q_1B1iIzp1SJdw",
    enabled: true,
    category: "profile_reset",
    imageUrl: "/solutions/discrepancy-review.png"
  },
  {
    id: "waste_review",
    name: "Waste Review",
    description: "Complete waste management and optimization review",
    presentationId: "1DOgFANIrqz7JuWMruM8LiHLx8OMqOrON0YchUozUpYQ",
    enabled: true,
    category: "profile_reset",
    imageUrl: "/solutions/waste-review.png"
  },

  {
    id: "solar_quote_review",
    name: "Solar Quote Review & Recommendation",
    description: "Comprehensive solar quote analysis and tailored recommendations",
    presentationId: "1haUf3MWTvJBppJkbB6-khaGiDFhtlyAYhBD-_cvuVmQ",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-quote.png"
  },
  {
    id: "solar_farm",
    name: "Solar Farm",
    description: "Large-scale solar farm development and implementation solutions",
    presentationId: "1AD4a5MTwnYl0_XqVULeyeoTAIfjCHuxGH_XRnN-LlLo",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-farm.png"
  },
  {
    id: "solar_car_park",
    name: "Solar Car Park",
    description: "Solar canopy solutions for car parks and parking structures",
    presentationId: "12BixHi5UX0hZpIoAVQB79dqcFMiVTzwaa7nTHipWY1g",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-carpark.png"
  },
  {
    id: "solar_rooftop",
    name: "Solar Rooftop",
    description: "Commercial and residential rooftop solar installation solutions",
    presentationId: "1sDM8-1-XD8s_ciOUIKuIKG9WY5sbeWa8uds4ueyE0ig",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-rooftop.png"
  },
  {
    id: "solar_monitoring",
    name: "Solar Monitoring",
    description: "Advanced solar system monitoring and performance optimization",
    presentationId: "1-CcTIPNfWGAB_ywWLdNUTC8oPFaiGmP3H2v8QUwAx1M",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-monitoring.png"
  },

  {
    id: "cooking_used_oil",
    name: "Cooking & Used Oil",
    description: "Sustainable cooking and used oil recovery and processing solutions",
    presentationId: "1NohfoE4Tck34V2uLWn9fvirW3peJKPUMqfmzE4CNLrg",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/cooking-oil.png"
  },
  {
    id: "baled_plastic_recycling",
    name: "Baled Plastic Recycling",
    description: "Comprehensive baled plastic recycling and processing systems",
    presentationId: "190wilKqZQFoEgsvJ6ZKYRmm-fY5rnQda7g_KFI0546I",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/plastic-recycling.png"
  },
  {
    id: "wood_offcut_recycling",
    name: "Wood Offcut Recycling",
    description: "Wood offcut collection, processing and recycling solutions",
    presentationId: "1cjjlNBeFaUmhPuJo4k07shvCKch0NhtMqS4B4CLjrI0",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/wood-recycling.png"
  },
  {
    id: "glass_bottle_recycling",
    name: "Glass Bottle Recycling",
    description: "Glass bottle collection and recycling management systems",
    presentationId: "1aECRrTGsaiW6_6fYjatP6nlhNND9QvsMAPQmI7V4D7Y",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/glass-recycling.png"
  },
  {
    id: "organic_waste_diversion",
    name: "Organic Waste Diversion",
    description: "Organic waste diversion and composting solutions",
    presentationId: "1IVNC9JBlyfJ70TgduSiW2YyJ2y3opYyhstjI3FZTjqY",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/organic-waste.png"
  },
  {
    id: "wax_cardboard",
    name: "Wax Cardboard",
    description: "Wax cardboard collection and specialized recycling processes",
    presentationId: "1WSpo6Ayr6blkQytM6Axpf59fdLXplSqt9K11epQ8gsA",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/wax-cardboard.png"
  },
  {
    id: "cardboard_bin_recycling",
    name: "Cardboard Bin Recycling",
    description: "Cardboard bin collection and recycling management",
    presentationId: "1oZU7F0j3buEAA6E5Ji3NT9xLLhZCPaIOKqA1xGgZcsY",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/cardboard-bin.png"
  },
  {
    id: "cardboard_bales_recycling",
    name: "Cardboard Bales Recycling",
    description: "Large-scale cardboard baling and recycling operations",
    presentationId: "1_ixppvK1AkVorOrqyu8ghnezO5Xc0BD36RBTDRFHTr8",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/cardboard-bales.png"
  },

  {
    id: "electricity_demand_response",
    name: "Electricity Demand Response",
    description: "Smart electricity demand response and grid optimization solutions",
    presentationId: "1qN5fqOq-1VXkwO4nV9PFzaINEyjYZy1_nNPMnKi2Rio",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/demand-response.png"
  },
  {
    id: "federal_government_incentives",
    name: "Federal Government Incentives",
    description: "Federal government sustainability and business incentive programs",
    presentationId: "1Sp8T3yOKnNxgP3BGMTtCukM7TYMAQONqXuu3Lxw6GxM",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/federal-incentives.png"
  },
  {
    id: "state_government_incentives",
    name: "State Government Incentives",
    description: "State-level government incentives and rebate programs",
    presentationId: "1kOVzGHbKBjj7hty_K2I6OOw3LtvAYbh6lSzKfwUo5m0",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/state-incentives.png"
  },
  {
    id: "carbon_credit_offset",
    name: "Australian Carbon Credit and Carbon Offset",
    description: "Australian carbon credit generation and offset management",
    presentationId: "1J0PuIWMgly8DqD6dAk46Fm7U1IU_EU_02PrvmD2rtbc",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/carbon-credit.png"
  },
  {
    id: "renewable_certificates",
    name: "Self-Managed Renewable Certificates",
    description: "Self-managed renewable energy certificate trading and optimization",
    presentationId: "1TB0Jz8Lc0qb4OJsOPp-UEqvek7_qpPG1dGDaKx8Cs-o",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/renewable-certificates.png"
  },

  {
    id: "backup_power_generators",
    name: "Back-up Power Generators",
    description: "Reliable backup power generation systems for business continuity",
    presentationId: "1NogU72GNKHqs0LNIqmblsn9I2Fa36V6dzNoqh6PACUA",
    enabled: true,
    category: "other_solutions",
    imageUrl: "/solutions/backup-power.png"
  },
  {
    id: "door_curtain_refrigerator",
    name: "Door Curtain Refrigerator",
    description: "Energy-efficient door curtain refrigeration solutions",
    presentationId: "1K87ZdSdlydCib0hdw7ax7XO0vAgY8dciy1KIpF5_B3I",
    enabled: true,
    category: "other_solutions",
    imageUrl: "/solutions/door-curtain.png"
  },

  {
    id: "ghg_reporting",
    name: "GHG Reporting",
    description: "Comprehensive greenhouse gas reporting and compliance solutions",
    presentationId: "1c4LRa0OB6K8Dh0tCH5dr7JWWqUl4sG8LZSZPhEnjdo4",
    enabled: true,
    category: "ghg",
    imageUrl: "/solutions/ghg-reporting.png"
  }
];
