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
  | "ghg"
  | "robot_finance"
  | "client_automation";

  export interface SolutionOption {
    id: string;
    name: string;
    description: string;
    presentationId?: string;
    pdfUrl?: string;
    enabled: boolean;
    category: SolutionCategory;
    agentType?: "aces" | "client";
    imageUrl?: string;
    phoneNumber?: string | {
      production: string;
      development: string;
    };
    agentCapabilities?: string[];
    customSheetUrl?: string;
    customSheetLabel?: string;
    subSolutions?: Omit<SolutionOption, "presentationId" | "enabled" | "category">[];
  }

export const categoryLabels: Record<SolutionCategory, string> = {
  platform: "🌱 Sustainable Platform",
  ai_bots: "🤖 AI Cleaning Bots",
  ai_automation: "📞 Digital Voice Agents & Numbers",
  referral: "📅 Advocate Event Program",
  profile_reset: "🔄 Profile Reset",
  renewable_energy: "☀️ Renewable Energy",
  resource_recovery: "♻️ Resource Recovery",
  asset_optimisation: "📈 Asset Optimisation",
  other_solutions: "🔧 Other Solutions",
  ghg: "🌍 GHG",
  robot_finance: "💰 Robot Finance",
  client_automation: "⚙️ Client Automation",
};

export const categoryDescriptions: Record<SolutionCategory, string> = {
  platform:
    "A unified sustainability platform that brings together energy, waste, automation, reporting, and resource management into one cohesive ecosystem. Designed to help businesses streamline operations, reduce environmental impact, and create measurable long-term value.",
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
  robot_finance:
    "Flexible financing solutions for autonomous cleaning robots including finance partner programs and rent-to-own structures.",
  client_automation:
    "Client-specific automation solutions for document processing, data extraction, and API-driven workflows.",
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
    description: "An intelligent assisted-scrubbing unit that enhances on-site cleaning efficiency. Built with precision navigation, proactive safety controls, and consistent high-performance scrubbing ideal for medium–large commercial facilities",
    presentationId: "1VqfPbIWfHwx11fXFfi8Z5qq0-AzgvMzooM1fV-FWtGs",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/assisted-scrubber.png"
  },
  {
    id: "scrubber_ai_bot",
    name: "Scrubber-Assisted AI Bot (SH1)",
    description: "An advanced autonomous scrubbing robot equipped with high-accuracy mapping, adaptive route planning, and real-time obstacle detection. Ideal for venues requiring consistent, repeatable deep-cleaning outcomes with minimal manual oversight.",
    presentationId: "1c0s191tvwa1ZenWPG5Ghdo5J4c0SPf3GbbjtDPO5lXE",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/scrubber-bot.png"
  },
  {
    id: "vacuum_mopping_ai_bot",
    name: "Vacuum-Mopping AI Bot (CC1)",
    description: "A fully autonomous vacuum-mopping bot combining powerful suction, dual-mode mopping, precision mapping, and automated docking. Perfect for hospitality and retail environments that require spotless presentation throughout the day.",
    presentationId: "1DCNrBY1AA-B4OLuMFIXvEhkN-rTA287J1TbESkD-3ts",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/vacuum-mopping-bot.png"
  },
  {
    id: "engagement_bot",
    name: "Customer Engagement Bot",
    description: "A front-of-house engagement bot designed to greet guests, answer common enquiries, guide visitors, and enhance customer experience. Uses conversational AI and visual displays to deliver consistent, friendly service in busy locations.",
    presentationId: "1W3SbzwNFyIoNCCoj_SFAULVHZT1pflNE031QF9dII8U",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/engagement-bot.png"
  },
  {
    id: "filtering_cleaning_bot",
    name: "Oil Filtering & Cleaning Assisted Unit",
    description: "A specialised filtration and cleaning unit that automates the management of cooking oil systems. Improves safety, consistency, and hygiene while reducing labour time and extending oil life through precise automated filtration cycles.",
    presentationId: "10srsHl936u9unxOE30EyGQKmsQU4XEpGbQcBhOG8_Gc",
    enabled: true,
    category: "ai_bots",
    imageUrl: "/solutions/oil-filtering-bot.png"
  },

 // === DIGITAL VOICE AGENTS ===
 {
  id: "digital_voice_agents",
  name: "Digital Inbound Receptionist",
  description:
    "AI-powered voice agents that handle calls, route enquiries, and assist with energy, cleaning, and general business operations.",
  presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8",
  enabled: true,
  category: "ai_automation",
  agentType: "aces",
  imageUrl: "/solutions/digital-voice-agents.png",
  phoneNumber: {
    production: "0340 519 216",
    development: "0483 902 753"
  },
  customSheetUrl: "https://docs.google.com/spreadsheets/d/1m2e_wnIZ62sD_C8j56bysma4Gaj6_ae3FJ_zZ9PdINQ/edit?gid=0#gid=0",
  customSheetLabel: "Digital Receptionist Transcripts",
  subSolutions: [
    {
      id: "aces_receptionist",
      name: "ACES Receptionist (Mary)",
      description:
        "Primary voice assistant for ACES handling all incoming calls, client enquiries, and transfers to specialist departments.",
      agentCapabilities: [
        "Greet callers and determine purpose of call",
        "Transfer to Energy or Cleaning agents",
        "Collect details and log enquiries",
        "Escalate complex issues",
        "Professional ACES representation"
      ]
    },
    {
      id: "energy_expert",
      name: "Energy Expert (Alex)",
      description:
        "Voice agent specialising in commercial & industrial electricity and gas. Explains bills, metering, and contracts clearly and confidently.",
      agentCapabilities: [
        "Explain electricity and gas concepts (NMI, MIRN, etc.)",
        "Clarify bill structures and tariffs",
        "Escalate contract/pricing queries",
        "Confirm customer details efficiently",
        "C&I customers only"
      ]
    },
    {
      id: "cleaning_expert",
      name: "Cleaning Expert (George)",
      description:
        "Voice agent specialising in autonomous cleaning robots, offering detailed guidance on technology and trials.",
      agentCapabilities: [
        "Explain robot functionality, safety, and efficiency",
        "Discuss ROI and sustainability metrics",
        "Collect trial enquiry details",
        "Escalate procurement queries",
        "Provide calm, informative explanations"
      ]
    }
  ]
},

// === OUTBOUND VOICE AGENT ===
// === OUTBOUND VOICE AGENT ===
{
  id: "outbound_agent",
  name: "Dynamic Outbound (Andrew) - OUTBOUND TRIGGERED & INBOUND CALLBACKS",
  description:
    "A dynamic outbound calling engine built for campaigns, follow-ups, and data-driven messaging. Andrew adapts each conversation using real-time logic, sheet-based variables, and conditional flows—making every call personalised, consistent, and compliant. Purpose-built for structured outreach, has inbound reception.",
  presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8",
  enabled: true,
  category: "ai_automation",
  agentType: "aces",
  imageUrl: "/solutions/outbound-agent.png",
  phoneNumber: {
    production: "0483 938 365",
    development: "0483 938 365"
  },
  customSheetUrl: "https://docs.google.com/spreadsheets/d/1RCgBkK9hj4crZytiOxEooFxIa7xsA5J8I2_4LNKLPJQ/edit?gid=0#gid=0",
  customSheetLabel: "Dynamic Sheet",
  agentCapabilities: [
    "⚠️ OUTBOUND CALLS ONLY - Does not answer incoming calls",
    "Logic-based outbound dialing with dynamic flow adjustment",
    "Tailored messaging based on client data and context",
    "Automated follow-ups and scheduling",
    "Campaign management and tracking"
  ],
  subSolutions: [
    {
      id: "electricity_demand_response_flow",
      name: "Electricity Demand Response Flow",
      description:
        "Outbound conversational flow presenting tailored information about electricity demand response programs using dynamic data inputs and logic splits.",
      agentCapabilities: [
        "Logic split node based on user type and program eligibility",
        "Dynamic presentation of demand response benefits",
        "Follow-up prompts based on user engagement"
      ]
    },
    {
      id: "gas_discrepancy_review_flow",
      name: "Gas Discrepancy Review Flow",
      description:
        "Outbound AI-driven flow for explaining gas discrepancies and gathering client confirmation to proceed with reviews.",
      agentCapabilities: [
        "Automatically presents discrepancy report data",
        "Handles clarifying questions interactively",
        "Collects user confirmation and closes loop with acknowledgment"
      ]
    },
    {
      id: "default_logic_flow",
      name: "Default Logic & Fallback Flow",
      description:
        "Fallback conversational logic for unclassified or incomplete data situations, ensuring the user always receives relevant information.",
      agentCapabilities: [
        "Graceful fallback prompts for missing data",
        "Route unrecognized cases to internal follow-up queue",
        "Ensures consistent experience across call scenarios"
      ]
    }
  ]
},

// === DYNAMIC INBOUND (ANDREW) ===
{
  id: "dynamic_inbound_andrew",
  name: "Dynamic Inbound (Andrew)",
  description:
    "A fully customised inbound agent for member-specific enquiries, connected directly to live data sheets and Twilio voice routing. Delivers personalised responses, handles complex logic splits, and accesses member solutions instantly — giving callers accurate, context-aware assistance without wait times.",
  presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8",
  enabled: true,
  category: "ai_automation",
  agentType: "aces",
  imageUrl: "/solutions/dynamic-inbound.png",
  phoneNumber: {
    production: "0468 050 399",
    development: "0468 050 399"
  },
  customSheetUrl: "https://docs.google.com/spreadsheets/d/1B4C12-ctkBuy8RN5oJquTV4xMYKjk-TLYGzRZ3bTyvY/edit?gid=0#gid=0",
  customSheetLabel: "Dynamic Sheet",
  agentCapabilities: [
    "Member-specific solution handling",
    "Dynamic routing based on member data",
    "Twilio-powered voice integration",
    "Access to member-specific solution sheets",
    "Gas member enquiry management"
  ]
},

// === INBOUND BOOKING (ALEX) ===
{
  id: "inbound_booking_alex",
  name: "Inbound Booking Receptionist (Alex)",
  description:
    "Custom booking integration for Frankston RSL to OBEE system via Twilio. Manages reservations and booking enquiries.",
  presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8",
  enabled: true,
  category: "ai_automation",
  agentType: "client", 
  imageUrl: "/solutions/inbound-booking.png",
  phoneNumber: {
    production: "0468 004 047",
    development: "0468 004 047"
  },
  customSheetUrl: "https://docs.google.com/spreadsheets/d/1KsASRS2AdJIdjBKuYGUGZbRygy1GbNNMChXmhTtcqk4/edit?gid=0#gid=0",
  customSheetLabel: "Booking Examples & Transcripts",
  agentCapabilities: [
    "Frankston RSL booking management",
    "OBEE system integration",
    "Reservation enquiry handling",
    "Custom Twilio integration",
    "Automated booking confirmation"
  ]
},
{
  id: "pudu_maintenance_agent",
  name: "Pudu Maintenance Support Agent (Cindy)",
  description:
    "A specialised maintenance support agent designed to assist customers with troubleshooting, repairs, and daily care for the Pudu CC1 autonomous cleaning robot. Cindy diagnoses common faults, provides step-by-step repair guidance, advises on consumable replacements, and escalates complex issues to specialist technicians when needed. Integrated with n8n for post-call reporting and connected to a dedicated knowledge base for accurate, up-to-date maintenance instructions.",
  presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8", // using your standard agent deck unless you want a new one
  enabled: true,
  category: "ai_automation",
  agentType: "client",
  imageUrl: "/solutions/pudu-maintenance-agent.png", // add image when ready
  phoneNumber: {
    production: "0482 086 553", // linked to the Trojan texting number for now
    development: "0482 086 553"
  },
  customSheetUrl: "https://docs.google.com/spreadsheets/d/1m2e_wnIZ62sD_C8j56bysma4Gaj6_ae3FJ_zZ9PdINQ/edit?gid=0#gid=0", // replace if needed
  customSheetLabel: "Maintenance Logs & Call Transcripts",
  agentCapabilities: [
    "Troubleshoot CC1 robot issues (water leaks, power problems, suction issues, drainage faults)",
    "Diagnose common faults and provide step-by-step repair guidance",
    "Advise on daily maintenance procedures",
    "Provide consumable replacement schedules (brushes, filters, cloths, rubber strips)",
    "Use knowledge-base-driven responses for accurate technical support",
    "Collect business and issue details for reporting",
    "Escalate complex faults to specialist technicians",
    "Send end-of-call reports to n8n automation"
  ]
},
// === TROJAN OIL API DOCKET READER ===
{
  id: "trojan_oil_docket_reader",
  name: "Trojan Oil API Docket Reader",
  description:
    "An automated SMS/MMS & Email document processing system that extracts data from oil dockets using advanced OCR and ACES’ custom API. Drivers simply text a photo — the system identifies product types, volumes, pricing, and customer details, then logs structured data instantly. Removes all manual entry and reduces admin error.",
  presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8",
  enabled: true,
  category: "ai_automation",
  agentType: "client", 
  imageUrl: "/solutions/docket-reader.png",
  phoneNumber: {
    production: "0482 086 553",
    development: "0482 086 553"
  },
  customSheetUrl: "https://docs.google.com/spreadsheets/d/1m1-Gq08L841Rqm39yvz_4nkyyFOzvI83BCvBRVVoJ38/edit?gid=0#gid=0",
  customSheetLabel: "API Output Sheet",
  agentCapabilities: [
    "SMS/MMS photo receipt via text message",
    "Automated OCR data extraction from oil dockets",
    "API-triggered processing workflow",
    "Structured data output for integration",
    "No voice interaction required - text only"
  ]
},
// === TROJAN OIL DOCKET READER (CLIENT AUTOMATION) ===
{
  id: "trojan_oil_docket_reader_client",
  name: "Trojan Oil Docket Reader",
  description:
    "A streamlined client automation that converts photographed oil dockets into clean, structured data. Designed for fast, accurate extraction without manual typing — ideal for delivery teams, admin departments, and operational workflows.",
  presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8",
  enabled: true,
  category: "client_automation",
  agentType: "client",
  imageUrl: "/solutions/docket-reader.png",
  customSheetUrl: "https://docs.google.com/spreadsheets/d/1m1-Gq08L841Rqm39yvz_4nkyyFOzvI83BCvBRVVoJ38/edit?gid=0#gid=0",
  customSheetLabel: "API Output Sheet",
},
// === EXTRUSIONS PURCHASE ORDER READER ===
{
  id: "extrusions_purchase_order_reader",
  name: "Extrusions Purchase Order Reader",
  description:
    "A smart OCR and data-processing tool that reads photographed purchase orders and automatically extracts item codes, quantities, pricing, and supplier details. Eliminates manual entry errors and moves clean data directly into your operational or accounting system.",
  presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8",
  enabled: true,
  category: "client_automation",
  agentType: "client",
  imageUrl: "/solutions/purchase-order-reader.png",
  customSheetUrl: "https://docs.google.com/spreadsheets/d/1b-FsuFf3CqWdhnQcco0MXyJsPsFokZVcxBA0bMRrRKs/edit?gid=0#gid=0",
  customSheetLabel: "API Output Sheet",
},

  {
    id: "event_referral",
    name: "Advocate Event Program",
    description: "A structured referral and event program that helps organisations host, manage, and track advocacy events. Provides end-to-end coordination, guest management, and performance reporting to grow awareness, generate leads, and strengthen community engagement.",
    presentationId: "1Jqi5pMRv0amYqMiPysc_hFi03vNorKio3A5fcRUluOc",
    enabled: true,
    category: "referral",
    imageUrl: "/solutions/event-referral.png"
  },

  {
    id: "electricity_ci_sme_align",
    name: "Electricity C&I Forward Pricing",
    description: "A commercial & industrial electricity alignment service that reviews contract terms, forward pricing trends, and tariff structures to ensure large-scale users are positioned for optimal pricing outcomes. Designed for businesses seeking clarity, stability, and strategic timing in volatile energy markets.",
    presentationId: "1im1Yl0AzuzJULk4_crwV1W7nOQV9XF7CvzRpkjRQV34",
    enabled: true,
    category: "profile_reset",
    imageUrl: "/solutions/electricity-align.png"
  },
  {
    id: "electricity_gas_discrepancy",
    name: "Electricity & Gas Discrepancy Review",
    description: "A detailed analysis of electricity and gas invoices to identify billing errors, metering issues, contract misalignments, and cost discrepancies. Provides a clear breakdown of findings and actionable recommendations to recover overcharges and prevent recurring errors.",
    presentationId: "1EC3SncEMHfaIoofzJTWKnPhEaa6w6q_1B1iIzp1SJdw",
    enabled: true,
    category: "profile_reset",
    imageUrl: "/solutions/discrepancy-review.png"
  },
  {
    id: "waste_review",
    name: "Waste Review",
    description: "A full waste and resource audit that evaluates current collection practices, bin configurations, recycling performance, and disposal costs. Delivers a structured improvement plan that reduces waste volumes, increases recovery rates, and lowers ongoing expenses.",
    presentationId: "1DOgFANIrqz7JuWMruM8LiHLx8OMqOrON0YchUozUpYQ",
    enabled: true,
    category: "profile_reset",
    imageUrl: "/solutions/waste-review.png"
  },

  {
    id: "solar_quote_review",
    name: "Solar Quote Review & Recommendation",
    description: "A comprehensive solar proposal review service that analyses pricing, system design, projected savings, and installer quality. Provides independent recommendations backed by transparent modelling, helping businesses select the most cost-effective and technically sound solar solution with confidence.",
    presentationId: "1haUf3MWTvJBppJkbB6-khaGiDFhtlyAYhBD-_cvuVmQ",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-quote.png"
  },
  {
    id: "solar_farm",
    name: "Solar Farm",
    description: "Large-scale solar generation solutions designed for commercial and industrial clients seeking long-term energy independence. Covers feasibility studies, grid connection modelling, commercial forecasting, and full project delivery for multi-megawatt solar farms that deliver predictable, high-yield energy performance.",
    presentationId: "1AD4a5MTwnYl0_XqVULeyeoTAIfjCHuxGH_XRnN-LlLo",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-farm.png"
  },
  {
    id: "solar_car_park",
    name: "Solar Car Park",
    description: "Dual-purpose solar canopy structures that convert car parks into high-value clean energy assets. Provides shade and weather protection for patrons while generating significant onsite renewable electricity. Compatible with EV charging, demand management, and advanced monitoring options.",
    presentationId: "12BixHi5UX0hZpIoAVQB79dqcFMiVTzwaa7nTHipWY1g",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-carpark.png"
  },
  {
    id: "solar_rooftop",
    name: "Solar Rooftop",
      description: "High-efficiency commercial rooftop solar systems engineered to reduce electricity costs, cut peak demand, and improve long-term operational resilience. Includes system design, installation, monitoring, and performance guarantees tailored to each building’s energy profile.",
      presentationId: "1sDM8-1-XD8s_ciOUIKuIKG9WY5sbeWa8uds4ueyE0ig",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-rooftop.png"
  },
  {
    id: "solar_monitoring",
    name: "Solar Monitoring",
    description: "Real-time solar performance tracking and fault detection platform that monitors inverter efficiency, system health, energy output, and savings. Enables predictive maintenance, maximises long-term generation, and ensures solar assets deliver their expected return on investment.",
    presentationId: "1-CcTIPNfWGAB_ywWLdNUTC8oPFaiGmP3H2v8QUwAx1M",
    enabled: true,
    category: "renewable_energy",
    imageUrl: "/solutions/solar-monitoring.png"
  },

  {
    id: "cooking_used_oil",
    name: "Cooking & Used Oil",
    description: "A complete cooking and used-oil recovery solution that improves kitchen efficiency and sustainability. Provides safe storage, reliable collection, and environmentally responsible processing, helping businesses reduce waste, lower disposal costs, and meet compliance requirements.",
    presentationId: "1NohfoE4Tck34V2uLWn9fvirW3peJKPUMqfmzE4CNLrg",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/cooking-oil.png"
  },
  {
    id: "baled_plastic_recycling",
    name: "Baled Plastic Recycling",
    description: "A streamlined recycling program for baled plastics that turns high-volume waste into recoverable resources. Optimises collection schedules, reduces contamination, and ensures materials are processed efficiently for maximum recycling value.",
    presentationId: "190wilKqZQFoEgsvJ6ZKYRmm-fY5rnQda7g_KFI0546I",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/plastic-recycling.png"
  },
  {
    id: "wood_offcut_recycling",
    name: "Wood Offcut Recycling",
    description: "A practical recycling pathway for timber offcuts and wood waste. Includes tailored collection systems, sorting optimisation, and responsible processing to reduce landfill volume and support circular-economy outcomes.",
    presentationId: "1cjjlNBeFaUmhPuJo4k07shvCKch0NhtMqS4B4CLjrI0",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/wood-recycling.png"
  },
  {
    id: "glass_bottle_recycling",
    name: "Glass Bottle Recycling",
    description: "A reliable glass collection and recycling solution that improves sorting efficiency, ensures safe handling, and diverts glass away from landfill. Designed for hospitality venues and high-volume glass users seeking improved recycling performance.",
    presentationId: "1aECRrTGsaiW6_6fYjatP6nlhNND9QvsMAPQmI7V4D7Y",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/glass-recycling.png"
  },
  {
    id: "organic_waste_diversion",
    name: "Organic Waste Diversion",
    description: "An organic waste diversion program that transforms food scraps and organic materials into compost or renewable products. Reduces landfill impact, lowers disposal costs, and supports environmentally responsible waste management.",
    presentationId: "1IVNC9JBlyfJ70TgduSiW2YyJ2y3opYyhstjI3FZTjqY",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/organic-waste.png"
  },
  {
    id: "wax_cardboard",
    name: "Wax Cardboard",
    description: "A specialised recycling stream for wax-coated cardboard that ensures proper collection, sorting, and processing. Enables businesses to divert a hard-to-recycle material from landfill and reduce overall waste footprint.",
    presentationId: "1WSpo6Ayr6blkQytM6Axpf59fdLXplSqt9K11epQ8gsA",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/wax-cardboard.png"
  },
  {
    id: "cardboard_bin_recycling",
    name: "Cardboard Bin Recycling",
    description: "A simple, high-efficiency cardboard recycling service with clear collection schedules, contamination reduction strategies, and responsible processing. Helps businesses lower waste costs and improve recycling rates.",
    presentationId: "1oZU7F0j3buEAA6E5Ji3NT9xLLhZCPaIOKqA1xGgZcsY",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/cardboard-bin.png"
  },
  {
    id: "cardboard_bales_recycling",
    name: "Cardboard Bales Recycling",
    description: "A large-volume recycling program for baled cardboard that ensures fast collection, consistent processing, and maximum material recovery. Ideal for warehouses, retail sites, and facilities generating significant cardboard waste.",
    presentationId: "1_ixppvK1AkVorOrqyu8ghnezO5Xc0BD36RBTDRFHTr8",
    enabled: true,
    category: "resource_recovery",
    imageUrl: "/solutions/cardboard-bales.png"
  },

  {
    id: "electricity_demand_response",
    name: "Electricity Demand Response",
    description: "A smart demand response program that helps businesses reduce costs and support grid stability by shifting or lowering electricity usage during peak periods. Provides clear financial incentives, automated participation strategies, and performance reporting tailored to each site’s operational needs.",
    presentationId: "1qN5fqOq-1VXkwO4nV9PFzaINEyjYZy1_nNPMnKi2Rio",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/demand-response.png"
  },
  {
    id: "federal_government_incentives",
    name: "Federal Government Incentives",
    description: "Access to federal sustainability and business incentive programs, including grants, rebates, and energy-efficiency funding. We identify eligible opportunities, guide documentation requirements, and help businesses secure financial support for sustainability and operational upgrades.",
    presentationId: "1Sp8T3yOKnNxgP3BGMTtCukM7TYMAQONqXuu3Lxw6GxM",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/federal-incentives.png"
  },
  {
    id: "state_government_incentives",
    name: "State Government Incentives",
    description: "Support navigating state-based rebate programs and environmental incentive schemes. Provides guidance on eligibility, application requirements, and financial benefits to help businesses reduce upgrade costs and accelerate sustainability initiatives.",
    presentationId: "1kOVzGHbKBjj7hty_K2I6OOw3LtvAYbh6lSzKfwUo5m0",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/state-incentives.png"
  },
  {
    id: "carbon_credit_offset",
    name: "Australian Carbon Credit and Carbon Offset",
    description: "A complete carbon credit and offset solution that helps businesses generate ACCUs, purchase offsets, and meet sustainability or compliance targets. Includes project assessment, carbon accounting, and strategic offset planning aligned with national standards.",
    presentationId: "1J0PuIWMgly8DqD6dAk46Fm7U1IU_EU_02PrvmD2rtbc",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/carbon-credit.png"
  },
  {
    id: "renewable_certificates",
    name: "Self-Managed Renewable Certificates",
    description: "A self-managed renewable energy certificate program that allows businesses to buy, track, retire, and trade certificates to meet sustainability goals. Provides full transparency, cost control, and strategic guidance for managing LGCs and other renewable certificates.",
    presentationId: "1TB0Jz8Lc0qb4OJsOPp-UEqvek7_qpPG1dGDaKx8Cs-o",
    enabled: true,
    category: "asset_optimisation",
    imageUrl: "/solutions/renewable-certificates.png"
  },

  {
    id: "backup_power_generators",
    name: "Back-up Power Generators",
    description: "Reliable backup power solutions designed to protect business operations during outages or grid instability. Includes generator sizing, installation, and integration with existing electrical systems to ensure seamless continuity, safety, and compliance without disruption.",
    presentationId: "1NogU72GNKHqs0LNIqmblsn9I2Fa36V6dzNoqh6PACUA",
    enabled: true,
    category: "other_solutions",
    imageUrl: "/solutions/backup-power.png"
  },
  {
    id: "door_curtain_refrigerator",
    name: "Door Curtain Refrigerator",
    description: "Energy-efficient refrigeration curtain systems that reduce cold-air loss, improve temperature stability, and lower electricity costs. Ideal for commercial kitchens, cool rooms, and refrigerated storage areas seeking improved performance and reduced energy consumption.",
    presentationId: "1K87ZdSdlydCib0hdw7ax7XO0vAgY8dciy1KIpF5_B3I",
    enabled: true,
    category: "other_solutions",
    imageUrl: "/solutions/door-curtain.png"
  },

  {
    id: "ghg_reporting",
    name: "GHG Reporting",
    description: "Comprehensive greenhouse gas reporting that measures Scope 1, 2, and 3 emissions using verified methodologies. Provides clear dashboards, compliance-ready documentation, and tailored reduction strategies to help businesses meet regulatory requirements, improve sustainability performance, and track progress over time.",
    presentationId: "1c4LRa0OB6K8Dh0tCH5dr7JWWqUl4sG8LZSZPhEnjdo4",
    enabled: true,
    category: "ghg",
    imageUrl: "/solutions/ghg-reporting.png"
  },

  {
    id: "finance_partner_program",
    name: "Finance Partner Program",
    description: "Configure OPEX documentation requirements and send Step 1 email to client. The finance partner will follow up with Step 2 requirements after submission. Suitable for businesses structured as Pty Ltd or Trust.\n\n• Generate Step 1 finance documentation\n• Configure business structure requirements (Pty Ltd/Trust)\n• Email client with finance partner details\n• Track finance application progress",
    presentationId: "1PLACEHOLDER_PRESENTATION_ID_FINANCE_PARTNER", // TODO: Replace with actual presentation ID
    enabled: true,
    category: "robot_finance",
    imageUrl: "/solutions/finance-partner.png"
  },
  {
    id: "rent_to_own_finance",
    name: "Rent-to-Own Finance (EGB)",
    description: "Direct rent-to-own financing through Environmental Global Benefits. 60-month term with fixed monthly rental (AUD 1,050 incl. GST). Includes full maintenance, warranty, and optional $1 title transfer at end of term.\n\n• Generate rent-to-own agreement documentation\n• Configure commercial terms (60-month term, AUD 1,050/month)\n• Set up insurance requirements (AUD 10M public liability)\n• Manage service level agreements and maintenance schedules\n• Process end-of-term options (return, month-to-month, or title transfer)",
    pdfUrl: "1hvbha_Mig2zfI40jZ9Y5uluDmwojBP3o",
    enabled: true,
    category: "robot_finance",
    imageUrl: "/solutions/rent-to-own.png"
  }
];
