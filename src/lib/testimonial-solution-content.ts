/**
 * Testimonial solution content: defaults in code (mirror of backend).
 * Used when backend is unavailable or as fallback. API overrides are stored on the backend.
 */

export const SOLUTION_TYPE_IDS = [
  "ci_electricity",
  "sme_electricity",
  "ci_gas",
  "sme_gas",
  "waste",
  "resource_recovery",
] as const;

export const SOLUTION_TYPE_LABELS: Record<string, string> = {
  ci_electricity: "C&I Electricity Reviews",
  sme_electricity: "SME Electricity Reviews",
  ci_gas: "C&I Gas Reviews",
  sme_gas: "SME Gas Reviews",
  waste: "Waste Reviews",
  resource_recovery: "Oil / Resource Recovery",
  dma: "Direct Metering Agreement",
  automated_cleaning_robot: "Automated Cleaning Robot",
};

export interface TestimonialSolutionContentItem {
  solution_type: string;
  solution_type_label: string;
  key_outcome_metrics: string;
  key_challenge_of_solution: string;
  key_approach_of_solution: string;
  key_outcome_of_solution: string;
  key_outcome_dotpoints_1: string;
  key_outcome_dotpoints_2: string;
  key_outcome_dotpoints_3: string;
  key_outcome_dotpoints_4: string;
  key_outcome_dotpoints_5: string;
  conclusion: string;
  esg_scope_for_solution: string;
  sdg_impact_for_solution: string;
}

const emptyItem = (solution_type: string, solution_type_label: string): TestimonialSolutionContentItem => ({
  solution_type,
  solution_type_label,
  key_outcome_metrics: "Cost Savings and Efficiency",
  key_challenge_of_solution: "Describe the challenge this solution addresses.",
  key_approach_of_solution: "Describe the approach taken.",
  key_outcome_of_solution: "Describe the outcome achieved.",
  key_outcome_dotpoints_1: "",
  key_outcome_dotpoints_2: "",
  key_outcome_dotpoints_3: "",
  key_outcome_dotpoints_4: "",
  key_outcome_dotpoints_5: "",
  conclusion: "Summarise the overall result and recommendation.",
  esg_scope_for_solution: "SCOPE 3",
  sdg_impact_for_solution: "SDG 7, 12, 13",
});

/** Default content for all solution types (fallback when API unavailable). */
export const DEFAULT_TESTIMONIAL_SOLUTION_CONTENT: TestimonialSolutionContentItem[] = [
  {
    ...emptyItem("ci_electricity", "C&I Electricity Reviews"),
    key_outcome_metrics: "Energy Cost Reduction, Contract Optimisation",
    key_challenge_of_solution:
      "High electricity costs and suboptimal retail contract terms for C&I sites.",
    key_approach_of_solution:
      "Review of contract structure, usage data, and market pricing to identify savings opportunities and improve commercial terms.",
    key_outcome_of_solution:
      "Reduced energy costs with improved contract clarity and ongoing visibility.",
    key_outcome_dotpoints_1: "Lower energy rates and improved contract terms.",
    key_outcome_dotpoints_2: "Improved billing transparency and structure.",
    key_outcome_dotpoints_3: "Demand and usage visibility.",
    key_outcome_dotpoints_4: "Market-aligned pricing.",
    key_outcome_dotpoints_5: "Ongoing monitoring and support.",
    conclusion:
      "A structured electricity review delivers measurable savings and long-term commercial clarity.",
    esg_scope_for_solution: "SCOPE 2",
    sdg_impact_for_solution: "SDG 7, 12",
  },

  {
    ...emptyItem("sme_electricity", "SME Electricity Reviews"),
    key_outcome_metrics: "Cost Savings, Simpler Energy Management",
    key_challenge_of_solution:
      "SME businesses often lack visibility into energy pricing and contract competitiveness.",
    key_approach_of_solution:
      "Benchmarking current rates against market offers and simplifying contract structures.",
    key_outcome_of_solution:
      "Lower electricity costs and simplified billing structures.",
    key_outcome_dotpoints_1: "Competitive market pricing secured.",
    key_outcome_dotpoints_2: "Simplified contract terms.",
    key_outcome_dotpoints_3: "Improved billing clarity.",
    key_outcome_dotpoints_4: "Reduced administrative burden.",
    key_outcome_dotpoints_5: "Ongoing support.",
    conclusion:
      "SME electricity reviews provide straightforward savings and improved cost visibility.",
    esg_scope_for_solution: "SCOPE 2",
    sdg_impact_for_solution: "SDG 7, 12",
  },

  {
    ...emptyItem("ci_gas", "C&I Gas Reviews"),
    key_outcome_metrics: "Gas Cost Optimisation, Billing Accuracy",
    key_challenge_of_solution:
      "Inconsistencies between contracted gas rates and invoiced charges, combined with limited market benchmarking.",
    key_approach_of_solution:
      "Forensic review of billing data and contracts alongside a market pricing review.",
    key_outcome_of_solution:
      "Improved billing accuracy and more competitive forward gas pricing.",
    key_outcome_dotpoints_1: "Identification of billing discrepancies.",
    key_outcome_dotpoints_2: "Structured reconciliation process.",
    key_outcome_dotpoints_3: "Improved cost transparency.",
    key_outcome_dotpoints_4: "Optimised contract pricing.",
    key_outcome_dotpoints_5: "Ongoing monitoring.",
    conclusion:
      "Gas reviews ensure accurate billing while delivering long-term cost optimisation.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 7, 12, 13",
  },

  {
    ...emptyItem("sme_gas", "SME Gas Reviews"),
    key_outcome_metrics: "Cost Reduction, Simpler Contracts",
    key_challenge_of_solution:
      "SME gas customers often operate on unoptimised contracts with limited pricing visibility.",
    key_approach_of_solution:
      "Market comparison and contract simplification.",
    key_outcome_of_solution:
      "Reduced gas costs and improved billing clarity.",
    key_outcome_dotpoints_1: "Competitive pricing secured.",
    key_outcome_dotpoints_2: "Simplified billing.",
    key_outcome_dotpoints_3: "Improved transparency.",
    key_outcome_dotpoints_4: "Reduced risk of overpayment.",
    key_outcome_dotpoints_5: "Ongoing support.",
    conclusion:
      "SME gas reviews deliver simple, reliable cost savings and improved clarity.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 7, 12, 13",
  },

  {
    ...emptyItem("waste", "Waste Reviews"),
    key_outcome_metrics: "Waste Cost Reduction, Operational Efficiency",
    key_challenge_of_solution:
      "Waste services are often misaligned with actual usage, leading to inefficiencies and unnecessary costs.",
    key_approach_of_solution:
      "Review of waste volumes, service frequency, and pricing structures.",
    key_outcome_of_solution:
      "Optimised waste services and reduced operating costs.",
    key_outcome_dotpoints_1: "Right-sized service levels.",
    key_outcome_dotpoints_2: "Reduced collection frequency where appropriate.",
    key_outcome_dotpoints_3: "Improved pricing structures.",
    key_outcome_dotpoints_4: "Reduced waste-related costs.",
    key_outcome_dotpoints_5: "Improved operational efficiency.",
    conclusion:
      "Waste reviews align services with actual needs, delivering cost and efficiency benefits.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 11, 12, 13",
  },

  {
    ...emptyItem("resource_recovery", "Oil / Resource Recovery"),
    key_outcome_metrics: "Resource Recovery, Cost Offset",
    key_challenge_of_solution:
      "Recoverable resources are often treated as waste, resulting in lost value and higher disposal costs.",
    key_approach_of_solution:
      "Identification and implementation of recovery pathways for reusable materials.",
    key_outcome_of_solution:
      "Reduced waste costs and improved sustainability outcomes.",
    key_outcome_dotpoints_1: "Recovery of reusable materials.",
    key_outcome_dotpoints_2: "Reduced disposal costs.",
    key_outcome_dotpoints_3: "Improved sustainability performance.",
    key_outcome_dotpoints_4: "Operational efficiency gains.",
    key_outcome_dotpoints_5: "Alignment with ESG goals.",
    conclusion:
      "Resource recovery transforms waste streams into cost-saving opportunities.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 6, 12, 13",
  },

  {
    ...emptyItem("dma", "Direct Metering Agreement"),
    key_outcome_metrics: "DMA metering cost reduction",
    key_challenge_of_solution:
      "Direct Metering Agreement charges were uncompetitive versus expected metering rates.",
    key_approach_of_solution:
      "Forensic review of metering line items and the agreement against benchmarks.",
    key_outcome_of_solution:
      "Lower metering costs quantified with a clear annual and multi-year saving.",
    key_outcome_dotpoints_1: "Annual metering spend and net saving identified.",
    key_outcome_dotpoints_2: "Agreement and invoice-led review—not retail-only benchmarking.",
    key_outcome_dotpoints_3: "Savings articulated for budgeting and approvals.",
    key_outcome_dotpoints_4: "Transparent metrics for CFO and committees.",
    key_outcome_dotpoints_5: "ESG: typically minimal GHG change where savings are metering-commercial.",
    conclusion: "DMA reviews deliver concise, defensible metering savings on a single-page summary.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 12",
  },

  {
    ...emptyItem("automated_cleaning_robot", "Automated Cleaning Robot"),
    key_outcome_metrics: "Labour Optimisation, Efficiency Gains",
    key_challenge_of_solution:
      "Manual cleaning processes are time-intensive, inconsistent, and labour-dependent.",
    key_approach_of_solution:
      "Deployment of autonomous cleaning technology to support routine operations.",
    key_outcome_of_solution:
      "Improved cleaning consistency and reduced reliance on manual labour.",
    key_outcome_dotpoints_1: "Reduced manual labour requirements.",
    key_outcome_dotpoints_2: "Increased cleaning frequency.",
    key_outcome_dotpoints_3: "Improved operational efficiency.",
    key_outcome_dotpoints_4: "Enhanced safety outcomes.",
    key_outcome_dotpoints_5: "Reduced resource usage.",
    conclusion:
      "Automated cleaning solutions deliver consistent outcomes while reducing operational costs.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 3, 8, 9, 11, 12",
  },
];
