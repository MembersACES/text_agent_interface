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
      "Review of current contract, usage patterns and market rates; negotiation of improved rates and terms.",
    key_outcome_of_solution:
      "Reduced monthly electricity spend with clearer contract terms and ongoing visibility.",
    key_outcome_dotpoints_1: "Lower rates and improved contract structure.",
    key_outcome_dotpoints_2: "Clearer billing and demand management visibility.",
    key_outcome_dotpoints_3: "Ongoing monitoring and support.",
    conclusion: "The C&I Electricity review delivered measurable savings and a more transparent contract.",
    esg_scope_for_solution: "SCOPE 2",
    sdg_impact_for_solution: "SDG 7, 12",
  },
  emptyItem("sme_electricity", "SME Electricity Reviews"),
  emptyItem("ci_gas", "C&I Gas Reviews"),
  emptyItem("sme_gas", "SME Gas Reviews"),
  emptyItem("waste", "Waste Reviews"),
  emptyItem("resource_recovery", "Oil / Resource Recovery"),
  {
    ...emptyItem("automated_cleaning_robot", "Automated Cleaning Robot"),
    key_outcome_metrics: "Labour Optimisation, Cost Savings and Increased Cleaning",
    key_challenge_of_solution:
      "Repetitive, time-consuming floor-cleaning tasks requiring significant manual labour for routine cleaning operations.",
    key_approach_of_solution:
      "IGA Creswick deployed an autonomous cleaning robot to assist and increase weekly floor-cleaning. A trial of one vacuum and mopping bot was initiated to determine effectiveness over conventional methods.",
    key_outcome_of_solution:
      "The robot performed extremely well and has been deployed full time, reducing cleaners by one day per week and freeing staff to focus on higher-value retail and customer engagement.",
    key_outcome_dotpoints_1: "Labour Savings: 547.5 hours reduced per year for one robot.",
    key_outcome_dotpoints_2:
      "Additional Cleaning: Store went from 3 cleans per week to 7 cleans per week, 5 by robot cleaner.",
    key_outcome_dotpoints_3:
      "Cost Savings: Estimated annual reduction of $27,600 with a net outcome of $16,800 after robot rental costs.",
    key_outcome_dotpoints_4: "Safety: Robot dries the floor almost instantly, reducing slip hazards.",
    key_outcome_dotpoints_5:
      "Water Reduction: Significant reduction in water used for floor cleaning while achieving better results.",
    conclusion:
      "A single automated cleaning robot delivers a measurable reduction in daily labour requirements and provides a repeatable annual operating cost saving. The cleaning robot is performing well.",
    esg_scope_for_solution: "SCOPE 3",
    sdg_impact_for_solution: "SDG 3, 6, 8, 9, 11, 12",
  },
];
