import pageMap from "../pageMap.json";

interface PageEntry {
  path: string;
  description?: string;
}

interface PageSection {
  path?: string;
  description?: string;
  pages?: Record<string, PageEntry>;
}

interface PageMap {
  [section: string]: PageSection;
}

/**
 * Context-aware ACES help tool
 * Directs users to correct navigation paths with Business Info as central hub
 */
export async function runHelpTool(message: string) {
  const lower = message.toLowerCase();

  const flatPages: { name: string; path: string; description: string }[] = [];
  const typedMap = pageMap as PageMap;

  // Flatten the page map for name/path lookup
  for (const [section, data] of Object.entries(typedMap)) {
    if (data.pages) {
      for (const [pageName, pageData] of Object.entries(data.pages)) {
        flatPages.push({
          name: pageName,
          path: pageData.path,
          description: pageData.description || "",
        });
      }
    } else if (data.path) {
      flatPages.push({
        name: section,
        path: data.path,
        description: data.description || "",
      });
    }
  }

  // Try matching against page names
  const found = flatPages.find(
    (p) =>
      lower.includes(p.name.toLowerCase()) ||
      lower.includes(p.path.replace("/", "").toLowerCase())
  );

  if (found) {
    return {
      message: `🧭 **${found.name}**  
${found.description}  

👉 Navigate to **${found.path}** to access this page.`,
      suggestedPage: found.path,
    };
  }

  // ========== CONTEXTUAL RESPONSES ==========

  // --- UTILITIES / DMA / ENERGY ---
  // Note: "robot" is handled in Solution Range section, "waste" can be utility or solution
  if (
    lower.includes("dma") ||
    lower.includes("direct metering") ||
    lower.includes("electricity") ||
    lower.includes("gas") ||
    (lower.includes("waste") && (lower.includes("invoice") || lower.includes("utility") || lower.includes("data"))) ||
    lower.includes("oil") ||
    lower.includes("utility") ||
    lower.includes("invoice")
  ) {
    return {
      message: `⚙️ To view or generate utility data (e.g. Electricity, Gas, Waste, Oil, DMA):  
1️⃣ Open **Business Info** and select the business.  
2️⃣ Scroll to the **Linked Utilities** section.  
3️⃣ Click the relevant utility (e.g. C&I Electricity, C&I Gas).  
4️⃣ This will open the **Utility Invoice Information** page pre-filled for that client.  

💡 You can also access **Utility Invoice Information** directly if you wish to search by NMI, MRIN, or Account Number manually.`,
      suggestedPage: "/business-info",
    };
  }

// --- DOCUMENT MANAGEMENT (Upload, Lodgement, Agreements) ---
if (
  lower.includes("upload") ||
  lower.includes("lodgement") ||
  lower.includes("signed agreement") ||
  lower.includes("agreement upload") ||
  lower.includes("invoice upload") ||
  lower.includes("data lodgement") ||
  lower.includes("document management")
) {
  return {
    message: `📁 To manage or upload documents:  
1️⃣ Go to **Document Management** in the sidebar.  
- **Document Generation** → Create new business documents (LOA, EOIs, Service Fee Agreements).  
- **Invoice & Data Lodgement** → Upload invoice and data reports for review.  
- **Signed Agreement Lodgement** → Upload and track finalised contracts or signatures.  

💡 These tools can be used directly — they do not require a linked business to be preselected.`,
    suggestedPage: "/document-generation",
  };
}

// --- DOCUMENT GENERATION (LOA, EOI, SERVICE AGREEMENT) ---
if (
  lower.includes("document generation") ||
  lower.includes("loa") ||
  lower.includes("authority") ||
  lower.includes("service fee") ||
  lower.includes("agreement") ||
  lower.includes("generate document") ||
  lower.includes("expression of interest") ||
  lower.includes("eoi")
) {
  return {
    message: `📄 To generate business documents (LOA, Service Fee Agreement, or EOI):  
1️⃣ Start from **Business Info** and search for the client.  
2️⃣ Click the **Documents** button — this opens **Document Generation** with all business details prefilled.  
3️⃣ Select either **Business Documents** or **Expression of Interest**.  
4️⃣ Choose your document type and click **Generate Document**.  

💡 Alternatively, you can access **Document Generation** directly to search or edit manually.`,
    suggestedPage: "/document-generation",
  };
}

  // --- CLIENT & STRATEGY TOOLS ---
  if (
    lower.includes("strategy") ||
    lower.includes("eoi") ||
    lower.includes("expression of interest") ||
    lower.includes("loa") ||
    lower.includes("client creation") ||
    lower.includes("canva")
  ) {
    return {
      message: `💼 To work on client strategies or EOIs:  
1️⃣ Start from **Business Info** to load the client.  
2️⃣ Then open **Client & Strategy** in the sidebar to use:  
 - **New Client LOA Generation**  
 - **Solutions Strategy Generator**  
 - **Canva Page** for visual strategy decks  

💡 These tools can also be used directly if you enter the client name or details manually.`,
      suggestedPage: "/business-info",
    };
  }

  // --- SITE PROFILING & GENERAL DATA ---
  if (lower.includes("profile") || lower.includes("site profiling")) {
    return {
      message: `📍 Site Profiling is linked to each business record.  
Open **Business Info**, select the business, and view or generate profiling data from the **Documents** section.  
You can also use **Site Profiling** to run it manually.`,
      suggestedPage: "/business-info",
    };
  }

  // --- SOLUTION RANGE & SERVICES ---
  if (
    lower.includes("solution") ||
    lower.includes("solutions") ||
    lower.includes("service") ||
    lower.includes("services") ||
    lower.includes("what solutions") ||
    lower.includes("available solutions") ||
    lower.includes("solution range") ||
    lower.includes("renewable energy") ||
    lower.includes("solar") ||
    lower.includes("ai bot") ||
    lower.includes("cleaning bot") ||
    lower.includes("voice agent") ||
    lower.includes("digital agent") ||
    lower.includes("resource recovery") ||
    lower.includes("waste recycling") ||
    lower.includes("asset optimisation") ||
    lower.includes("asset optimization") ||
    lower.includes("demand response") ||
    lower.includes("carbon credit") ||
    lower.includes("ghg") ||
    lower.includes("greenhouse gas") ||
    lower.includes("profile reset") ||
    lower.includes("robot finance") ||
    lower.includes("rent to own") ||
    lower.includes("finance partner")
  ) {
    return {
      message: `💰 **Solution Range** — Explore ACES's comprehensive sustainable solutions:

📋 **Available Categories:**
• 🌱 Sustainable Platform — Integrated sustainability initiatives
• 🤖 AI Cleaning Bots — Autonomous cleaning robots (Scrubber, Vacuum-Mopping, etc.)
• 📞 Digital Voice Agents — AI-powered 24/7 customer service agents
• 🔄 Profile Reset — Utility profile optimization and discrepancy reviews
• ☀️ Renewable Energy — Solar rooftop, car park, farms, and monitoring
• ♻️ Resource Recovery — Waste recycling (cooking oil, plastic, cardboard, wood, glass, organic)
• 📈 Asset Optimisation — Demand response, government incentives, carbon credits
• 🔧 Other Solutions — Backup power, energy-efficient refrigeration
• 🌍 GHG — Greenhouse gas reporting and compliance
• 💰 Robot Finance — Finance partner programs and rent-to-own options

👉 Navigate to **Solution Range** to browse all solutions, view presentations, and access detailed information about each service.`,
      suggestedPage: "/solution-range",
    };
  }

  // --- ROBOT FINANCE SPECIFIC ---
  if (
    lower.includes("robot finance") ||
    lower.includes("finance robot") ||
    lower.includes("rent to own") ||
    lower.includes("rent-to-own") ||
    lower.includes("finance partner") ||
    lower.includes("robot financing")
  ) {
    return {
      message: `💰 **Robot Finance Solutions** — Two financing options available:

1️⃣ **Finance Partner Program**
   • Configure OPEX documentation requirements
   • Generate Step 1 email to client
   • Finance partner handles Step 2 requirements
   • Suitable for Pty Ltd and Trust structures

2️⃣ **Rent-to-Own Finance (EGB)**
   • Direct financing through Environmental Global Benefits
   • 60-month term with fixed monthly rental (AUD 1,050 incl. GST)
   • Includes full maintenance and warranty
   • Optional $1 title transfer at end of term

👉 Navigate to **Solution Range → Robot Finance** to view detailed information and documentation for both options.`,
      suggestedPage: "/solution-range",
    };
  }

  // --- DEFAULT HELP ---
  return {
    message: `🤖 I can help you navigate the ACES Dashboard.  
Try asking:  
- "Where do I upload an agreement?"  
- "How can I view C&I gas invoices?"  
- "Where do I generate a new EOI?"  
- "How do I profile a client site?"  
- "What solutions are available?"  
- "Tell me about robot finance options"  

💡 Most client-specific data starts from **Business Info**.  
💡 Browse all available solutions in **Solution Range**.`,
    suggestedPage: "/business-info",
  };
}
