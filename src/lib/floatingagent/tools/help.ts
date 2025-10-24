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
  if (
    lower.includes("dma") ||
    lower.includes("direct metering") ||
    lower.includes("electricity") ||
    lower.includes("gas") ||
    lower.includes("waste") ||
    lower.includes("oil") ||
    lower.includes("robot") ||
    lower.includes("utility") ||
    lower.includes("invoice")
  ) {
    return {
      message: `⚙️ To view or generate utility data (e.g. Electricity, Gas, Waste, Oil, DMA):  
1️⃣ Open **Business Info** and select the business.  
2️⃣ Scroll to the **Linked Utilities** section.  
3️⃣ Click the relevant utility (e.g. C&I Electricity, C&I Gas).  
4️⃣ This will open the **Utility Invoice Information** page pre-filled for that client.  

💡 You can also access **Data & Information → Utility Invoice Information** directly if you wish to search by NMI, MRIN, or Account Number manually.`,
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

💡 Alternatively, you can access **Document Management → Document Generation** directly to search or edit manually.`,
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
 - New Client LOA Generator  
 - Solutions Strategy Generator  
 - Canva Page for visual strategy decks  

💡 These tools can also be used directly if you enter the client name or details manually.`,
      suggestedPage: "/business-info",
    };
  }

  // --- SITE PROFILING & GENERAL DATA ---
  if (lower.includes("profile") || lower.includes("site profiling")) {
    return {
      message: `📍 Site Profiling is linked to each business record.  
Open **Business Info**, select the business, and view or generate profiling data from the **Documents** section.  
You can also use **Data & Information → Site Profiling** to run it manually.`,
      suggestedPage: "/business-info",
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

💡 Most client-specific data starts from **Business Info**.`,
    suggestedPage: "/business-info",
  };
}
