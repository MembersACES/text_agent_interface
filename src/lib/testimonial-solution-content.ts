/**
 * Testimonial solution content: defaults in code.
 * Must stay in sync with text_agent_backend/tools/testimonial_solution_content.py
 * (same placeholder keys and the same narrative strings).
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

/** Testimonial solution type id for Solar Panel Cleaning (extra fields in generate modal). */
export const SOLAR_PANEL_CLEANING_SOLUTION_TYPE_ID = "solar_panel_cleaning" as const;

export const SOLUTION_TYPE_LABELS: Record<string, string> = {
  ci_electricity: "C&I Electricity Reviews",
  sme_electricity: "SME Electricity Reviews",
  ci_gas: "C&I Gas Reviews",
  sme_gas: "SME Gas Reviews",
  waste: "Waste Reviews",
  resource_recovery: "Oil / Resource Recovery",
  dma: "Direct Metering Agreement",
  vas: "Value Added Service",
  automated_cleaning_robot: "Automated Cleaning Robot",
  solar_panel_cleaning: "Solar Panel Cleaning",
  client_endorsement: "Client Endorsement",
  association_endorsement: "Association Endorsement",
  ghg_roadmap: "GHG Roadmap",
  solar_review: "Solar Review",
  gas_discrepancy: "Gas Discrepancy Recovery",
  electricity_discrepancy: "Electricity Discrepancy",
  demand_reset: "Demand Reset",
  cds: "CDS (Container Deposit Scheme)",
};

/** Lead-in under Key Outcomes. Must match testimonial_solution_content.py. */
export const SOLUTION_FAMILY_LEAD_INS: Record<string, string> = {
  "Profile Reset":
    "Starting with a full review of existing agreements, to identify opportunities in Profile Resets.",
  "Asset Optimisation":
    "Starting with a review of how the existing asset is performing, to identify opportunities in Asset Optimisation.",
  "Resource Recovery":
    "Starting with a review of the current material stream, to identify opportunities in Resource Recovery.",
};

/** Blank family: Client Endorsement, Association Endorsement, GHG Roadmap, and custom types. */
export const SOLUTION_TYPE_FAMILIES: Record<string, string> = {
  ci_electricity: "Profile Reset",
  sme_electricity: "Profile Reset",
  ci_gas: "Profile Reset",
  sme_gas: "Profile Reset",
  waste: "Profile Reset",
  dma: "Profile Reset",
  vas: "Profile Reset",
  gas_discrepancy: "Profile Reset",
  electricity_discrepancy: "Profile Reset",
  demand_reset: "Profile Reset",
  resource_recovery: "Resource Recovery",
  cds: "Resource Recovery",
  solar_panel_cleaning: "Asset Optimisation",
  solar_review: "Asset Optimisation",
  automated_cleaning_robot: "Asset Optimisation",
};

export function solutionFamilyFields(solutionTypeId: string): {
  solution_family: string;
  solution_family_lead_in: string;
} {
  const family = SOLUTION_TYPE_FAMILIES[solutionTypeId] ?? "";
  return {
    solution_family: family,
    solution_family_lead_in: SOLUTION_FAMILY_LEAD_INS[family] ?? "",
  };
}

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

export const emptyItem = (solution_type: string, solution_type_label: string): TestimonialSolutionContentItem => ({
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
    key_outcome_metrics: "Lower energy cost, better contract terms",
    key_challenge_of_solution: "The member was paying more than necessary for electricity, with contract terms that were hard to compare and invoices that did not clearly match what had been agreed.",
    key_approach_of_solution: "The ACES team reviewed the contract, usage and market price, and reset the commercial terms.",
    key_outcome_of_solution: "The ACES team handled retailer negotiation on the member's behalf, reconciling proposed rates to the member's invoices before anything went to the board. The member was not asked to run the numbers or sit in the retailer meetings.",
    key_outcome_dotpoints_1: "Lower rates and better contract terms.",
    key_outcome_dotpoints_2: "Clearer billing structure.",
    key_outcome_dotpoints_3: "Demand and usage visibility.",
    key_outcome_dotpoints_4: "Market-aligned pricing.",
    key_outcome_dotpoints_5: "Ongoing monitoring and support.",
    conclusion: "A structured electricity review delivers measurable savings and long-term commercial clarity.",
    esg_scope_for_solution: "SCOPE 2",
    sdg_impact_for_solution: "SDG 7, 12",
  },
  {
    ...emptyItem("sme_electricity", "SME Electricity Reviews"),
    key_outcome_metrics: "Cost Savings, Simpler Energy Management",
    key_challenge_of_solution: "The member had little visibility of whether its electricity rates were competitive, and found the contract and bills time-consuming to interpret.",
    key_approach_of_solution: "The ACES team benchmarked the rates against current offers and simplified the contract.",
    key_outcome_of_solution: "The ACES team ran the electricity review in the background of a busy SME week, checking proposed figures against the member's invoices as they went. The owner was not asked to clear a diary for retailer calls or spreadsheet work.",
    key_outcome_dotpoints_1: "Competitive market pricing secured.",
    key_outcome_dotpoints_2: "Simplified contract terms.",
    key_outcome_dotpoints_3: "Improved billing clarity.",
    key_outcome_dotpoints_4: "Reduced administrative burden.",
    key_outcome_dotpoints_5: "Ongoing support.",
    conclusion: "SME electricity reviews provide straightforward savings and improved cost visibility.",
    esg_scope_for_solution: "SCOPE 2",
    sdg_impact_for_solution: "SDG 7, 12",
  },
  {
    ...emptyItem("ci_gas", "C&I Gas Reviews"),
    key_outcome_metrics: "Gas Cost Optimisation, Billing Accuracy",
    key_challenge_of_solution: "The member could not tell whether invoiced gas charges matched the contracted rates, and had no independent view of whether the price was still competitive.",
    key_approach_of_solution: "The ACES team forensically reviewed billing data and contracts alongside a market pricing review.",
    key_outcome_of_solution: "The ACES team conducted the gas retail negotiation so the member's operations team did not have to. Each claimed saving was tied to an invoiced charge rather than a rate sitting on the contract, and only then did the pack go to the board.",
    key_outcome_dotpoints_1: "Identification of billing discrepancies.",
    key_outcome_dotpoints_2: "Structured reconciliation process.",
    key_outcome_dotpoints_3: "Improved cost transparency.",
    key_outcome_dotpoints_4: "Optimised contract pricing.",
    key_outcome_dotpoints_5: "Ongoing monitoring.",
    conclusion: "Gas reviews ensure accurate billing while delivering long-term cost optimisation.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 7, 12, 13",
  },
  {
    ...emptyItem("sme_gas", "SME Gas Reviews"),
    key_outcome_metrics: "Cost Reduction, Simpler Contracts",
    key_challenge_of_solution: "The member was on a gas contract it had little time to review, with limited visibility of whether pricing was fair or the bills were accurate.",
    key_approach_of_solution: "The ACES team ran a market comparison and simplified the contract.",
    key_outcome_of_solution: "The ACES team sorted gas pricing around the member's existing workload rather than adding another project to it. The new offer was matched to the member's invoices so the saving was visible without a finance deep-dive.",
    key_outcome_dotpoints_1: "Competitive pricing secured.",
    key_outcome_dotpoints_2: "Simplified billing.",
    key_outcome_dotpoints_3: "Improved transparency.",
    key_outcome_dotpoints_4: "Reduced risk of overpayment.",
    key_outcome_dotpoints_5: "Ongoing support.",
    conclusion: "SME gas reviews deliver simple, reliable cost savings and improved clarity.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 7, 12, 13",
  },
  {
    ...emptyItem("waste", "Waste Reviews"),
    key_outcome_metrics: "Lower waste cost, right-sized service",
    key_challenge_of_solution: "The member was paying for waste services that no longer matched how the site actually operated, with little time to check whether frequency and pricing were still right.",
    key_approach_of_solution: "The ACES team reviewed waste volumes, service frequency and pricing structures.",
    key_outcome_of_solution: "The ACES team confirmed the current charges from the member's invoices, then changed collection frequency and service levels with no interruption to site operations. Bins kept moving while the contract caught up.",
    key_outcome_dotpoints_1: "Right-sized service levels.",
    key_outcome_dotpoints_2: "Fewer collections where it still works.",
    key_outcome_dotpoints_3: "Improved pricing structures.",
    key_outcome_dotpoints_4: "Reduced waste-related costs.",
    key_outcome_dotpoints_5: "Improved operational efficiency.",
    conclusion: "Waste reviews align services with actual needs, delivering cost and efficiency benefits.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 11, 12, 13",
  },
  {
    ...emptyItem("resource_recovery", "Oil / Resource Recovery"),
    key_outcome_metrics: "Used-oil revenue and lower oil use",
    key_challenge_of_solution: "Used cooking oil was only a disposal cost, and the kitchen was buying more oil than it needed.",
    key_approach_of_solution: "The ACES team paired oil recovery with a tighter supply model, without hurting plate quality.",
    key_outcome_of_solution: "The ACES team timed collections and new stock around kitchen service. Usage was taken from the invoices, not supplier estimates.",
    key_outcome_dotpoints_1: "Revenue from used oil, not disposal.",
    key_outcome_dotpoints_2: "Lower litres for the same output.",
    key_outcome_dotpoints_3: "Better sales per litre and fry life.",
    key_outcome_dotpoints_4: "Lower oil cost per dollar of food.",
    key_outcome_dotpoints_5: "Less cleaning from better oil care.",
    conclusion: "Oil recovery plus a tighter supply model, checked against the invoices.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 7, 9, 12, 13",
  },
  {
    ...emptyItem("dma", "Direct Metering Agreement"),
    key_outcome_metrics: "DMA metering cost reduction",
    key_challenge_of_solution: "Metering charges looked high, and the agreement was hard to unpick without specialist time.",
    key_approach_of_solution: "The ACES team forensically reviewed metering line items and the agreement against benchmarks.",
    key_outcome_of_solution: "The ACES team reviewed metering charges from the invoices and the agreement, so finance could sign off without a specialist.",
    key_outcome_dotpoints_1: "Annual metering spend and saving.",
    key_outcome_dotpoints_2: "Review led by the agreement and invoices.",
    key_outcome_dotpoints_3: "Savings set out for approval.",
    key_outcome_dotpoints_4: "Clear figures for finance.",
    key_outcome_dotpoints_5: "The saving is commercial, not a GHG cut.",
    conclusion: "DMA reviews deliver concise, defensible metering savings on a single-page summary.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 12",
  },
  {
    ...emptyItem("vas", "Value Added Service"),
    key_outcome_metrics: "VAS service cost reduction",
    key_challenge_of_solution: "VAS charges sat on the metering invoices and were hard to separate from meter rental.",
    key_approach_of_solution: "The ACES team isolated VAS line items from meter rental and reviewed them against typical service-charge benchmarks.",
    key_outcome_of_solution: "The ACES team separated the VAS charge from meter rental using the invoices. Finance could sign off the service charge without a specialist.",
    key_outcome_dotpoints_1: "Annual VAS spend and the saving.",
    key_outcome_dotpoints_2: "VAS separated from meter rental.",
    key_outcome_dotpoints_3: "Savings set out for approval.",
    key_outcome_dotpoints_4: "Clear figures for finance.",
    key_outcome_dotpoints_5: "The saving is commercial, not a GHG cut.",
    conclusion: "VAS reviews isolate the service charge and show a defensible saving.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 12",
  },
  {
    ...emptyItem("automated_cleaning_robot", "Automated Cleaning Robot"),
    key_outcome_metrics: "Less cleaning labour, safer floors",
    key_challenge_of_solution: "Routine floor cleaning was absorbing staff time the member would rather spend on guests and revenue-facing work, with no straightforward way to test a better method.",
    key_approach_of_solution: "The ACES team trialled a floor robot on normal shifts, then locked the roster once it held up.",
    key_outcome_of_solution: "The ACES team ran the trial without pulling staff off shift. Faster floor dry-down reduced slip exposure versus manual mop cycles.",
    key_outcome_dotpoints_1: "Less time on routine floor cleaning.",
    key_outcome_dotpoints_2: "Annual labour saving at the agreed rate.",
    key_outcome_dotpoints_3: "Faster dry floors and lower slip risk.",
    key_outcome_dotpoints_4: "Less water for the same floor result.",
    key_outcome_dotpoints_5: "A repeatable clean that can scale.",
    conclusion: "A proven robot turns a daily manual clean into a documented annual saving.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 3, 6, 8, 9, 11, 12",
  },
  {
    ...emptyItem("solar_panel_cleaning", "Solar Panel Cleaning"),
    key_outcome_metrics: "Higher yield after clean and inspection",
    key_challenge_of_solution: "Solar yield had drifted with soiling and minor defects, and faults were easy to miss.",
    key_approach_of_solution: "The ACES team cleaned the array, completed an electrical inspection, and compared like-for-like generation.",
    key_outcome_of_solution: "The ACES team measured the result off the member's own metering, so it is not a supplier's claim. Like-for-like intervals were used so the comparison could not be dismissed as a sunny-day spike.",
    key_outcome_dotpoints_1: "Higher daily generation after the clean.",
    key_outcome_dotpoints_2: "Dollar value of the extra kWh.",
    key_outcome_dotpoints_3: "Less grid energy and fewer emissions.",
    key_outcome_dotpoints_4: "No electrical faults flagged.",
    key_outcome_dotpoints_5: "Less risk of hidden panel degradation.",
    conclusion: "A clean plus inspection restores yield and surfaces faults early.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 7, 8, 9, 13",
  },
  {
    ...emptyItem("client_endorsement", "Client Endorsement"),
    key_outcome_metrics: "One partner for energy and sustainability",
    key_challenge_of_solution: "The member was dealing with retailers, contractors and invoices in pieces, with no one owner who could explain what was worth doing and then actually do it.",
    key_approach_of_solution: "The ACES team advised ongoing, ran the supplier conversations, and kept staff off the project work.",
    key_outcome_of_solution: "The member had a named team they could call, a clear picture of what had been done, and less time spent chasing quotes, contracts and follow-up.",
    key_outcome_dotpoints_1: "One partner across energy and waste.",
    key_outcome_dotpoints_2: "Supplier conversations handled for them.",
    key_outcome_dotpoints_3: "Less time spent on bills and offers.",
    key_outcome_dotpoints_4: "A record the board can read.",
    key_outcome_dotpoints_5: "Support continues after the first saving.",
    conclusion: "ACES as the member's energy team, not a one-off quote.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 8, 12, 17",
  },
  {
    ...emptyItem("association_endorsement", "Association Endorsement"),
    key_outcome_metrics: "Network outcomes and invoice support",
    key_challenge_of_solution: "Sub-branches were dealing with electricity and gas in isolation, with no shared programme and no one checking invoices after the contract was signed.",
    key_approach_of_solution: "The ACES team ran group electricity and gas reviews, checked invoices, and stayed on after signing.",
    key_outcome_of_solution: "Participating sub-branches secured rates, and the association had a partner still accountable after signing — not a one-off tender.",
    key_outcome_dotpoints_1: "Group electricity and gas reviews.",
    key_outcome_dotpoints_2: "Invoices checked and errors resolved.",
    key_outcome_dotpoints_3: "Support continued after signing.",
    key_outcome_dotpoints_4: "Results visible across sub-branches.",
    key_outcome_dotpoints_5: "One partner, not a one-off tender.",
    conclusion: "A network reference from the peak body, not a single-site saving.",
    esg_scope_for_solution: "SCOPE 2, 3",
    sdg_impact_for_solution: "SDG 7, 12, 17",
  },
  {
    ...emptyItem("ghg_roadmap", "GHG Roadmap"),
    key_outcome_metrics: "A board-ready greenhouse gas plan",
    key_challenge_of_solution: "The member needed a credible greenhouse-gas story for committees and stakeholders, but inventory, baselines and next actions were scattered or incomplete.",
    key_approach_of_solution: "The ACES team built the roadmap from the member's own data and sequenced practical projects.",
    key_outcome_of_solution: "The member received a plan they could defend: what the footprint is, which actions move it, and what can be done this year versus later.",
    key_outcome_dotpoints_1: "Scope 1, 2 and relevant Scope 3.",
    key_outcome_dotpoints_2: "A sequenced plan, not a wish-list.",
    key_outcome_dotpoints_3: "Actions tied to current operations.",
    key_outcome_dotpoints_4: "Numbers a board can stand behind.",
    key_outcome_dotpoints_5: "A baseline later projects report to.",
    conclusion: "A greenhouse gas plan the member can update as projects land.",
    esg_scope_for_solution: "SCOPE 1, 2, 3",
    sdg_impact_for_solution: "SDG 7, 12, 13",
  },
  {
    ...emptyItem("solar_review", "Solar Review"),
    key_outcome_metrics: "Performance, tariff fit, and next steps",
    key_challenge_of_solution: "The member could not tell if the array was performing, or if an upgrade would pay back.",
    key_approach_of_solution: "The ACES team checked generation, imports and the tariff against the member's actual load.",
    key_outcome_of_solution: "The member had a clear finding: keep, maintain, or change the system and tariff, with numbers that could be shown to a committee.",
    key_outcome_dotpoints_1: "Generation checked against expected.",
    key_outcome_dotpoints_2: "Tariff reviewed for the real load.",
    key_outcome_dotpoints_3: "Upgrade claims tested, not assumed.",
    key_outcome_dotpoints_4: "Cleaning flagged only if yield moves.",
    key_outcome_dotpoints_5: "A recommendation ready for capex.",
    conclusion: "A check of the solar asset, separate from a one-off panel clean.",
    esg_scope_for_solution: "SCOPE 2",
    sdg_impact_for_solution: "SDG 7, 9, 13",
  },
  {
    ...emptyItem("gas_discrepancy", "Gas Discrepancy Recovery"),
    key_outcome_metrics: "Recovered overcharge, corrected billing",
    key_challenge_of_solution: "Gas invoices did not match the contract or meter, and the member was absorbing the difference because reconciling retailer bills is slow and specialist.",
    key_approach_of_solution: "The ACES team rebuilt the correct bill from the contract and meter, then claimed it.",
    key_outcome_of_solution: "The overcharge was quantified and pursued, so the member was not left to argue a technical billing error without evidence.",
    key_outcome_dotpoints_1: "Invoice lines checked to the contract.",
    key_outcome_dotpoints_2: "The dollar gap stated for finance.",
    key_outcome_dotpoints_3: "ACES dealt with the retailer.",
    key_outcome_dotpoints_4: "A paper trail for the credit.",
    key_outcome_dotpoints_5: "Later bills watched for a repeat.",
    conclusion: "Money back where the gas invoice did not match the agreement.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 12",
  },
  {
    ...emptyItem("electricity_discrepancy", "Electricity Discrepancy"),
    key_outcome_metrics: "Corrected billing, recovered overcharge",
    key_challenge_of_solution: "Electricity invoices were out of step with the contract, meter or agreed adjustments, and the error was easy to miss in a long tax invoice.",
    key_approach_of_solution: "The ACES team checked rates and quantities against the contract, then asked for a correction.",
    key_outcome_of_solution: "The member had a quantified adjustment and a corrected billing position, without having to run the reconciliation in-house.",
    key_outcome_dotpoints_1: "Rates and quantities checked to the deal.",
    key_outcome_dotpoints_2: "The dollar gap stated for finance.",
    key_outcome_dotpoints_3: "Correction sent with the workings.",
    key_outcome_dotpoints_4: "Network issues split from retailer error.",
    key_outcome_dotpoints_5: "Later bills watched for a repeat.",
    conclusion: "The electricity bill brought back in line with the agreement.",
    esg_scope_for_solution: "SCOPE 2",
    sdg_impact_for_solution: "SDG 7, 12",
  },
  {
    ...emptyItem("demand_reset", "Demand Reset"),
    key_outcome_metrics: "Lower demand charges, ratchet reset",
    key_challenge_of_solution: "Network charges were still based on a high maximum demand that no longer reflected how the site ran, so the member was paying for a peak that was history.",
    key_approach_of_solution: "The ACES team evidenced actual demand and ran the reset with the distributor.",
    key_outcome_of_solution: "Demand was reset (or a clear pathway obtained) so ongoing network charges better matched current operations.",
    key_outcome_dotpoints_1: "Old peak compared with current demand.",
    key_outcome_dotpoints_2: "Dollar impact of the reset.",
    key_outcome_dotpoints_3: "Distributor process run by ACES.",
    key_outcome_dotpoints_4: "Notes so a spike does not return.",
    key_outcome_dotpoints_5: "The result shows on later invoices.",
    conclusion: "A demand reset is a network-charge outcome: stop paying for a peak the site no longer sets.",
    esg_scope_for_solution: "SCOPE 2",
    sdg_impact_for_solution: "SDG 7, 12",
  },
  {
    ...emptyItem("cds", "CDS (Container Deposit Scheme)"),
    key_outcome_metrics: "Container refunds and less waste",
    key_challenge_of_solution: "Eligible drink containers were still going out with general waste or recycling, so refund value and diversion were being left on the table.",
    key_approach_of_solution: "The ACES team set up a CDS path staff can run on shift, and a way to claim the refunds.",
    key_outcome_of_solution: "Containers that qualify are separated and claimed, so the member sees both a small revenue line and a cleaner waste profile.",
    key_outcome_dotpoints_1: "Eligible containers picked out of waste.",
    key_outcome_dotpoints_2: "A method staff can run on shift.",
    key_outcome_dotpoints_3: "Refunds finance can see.",
    key_outcome_dotpoints_4: "Less eligible stock in general waste.",
    key_outcome_dotpoints_5: "Sits beside the waste review.",
    conclusion: "Refunds captured from containers that were previously thrown out.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 12",
  },
];
