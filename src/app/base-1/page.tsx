import Link from "next/link";
import { PageHeader } from "@/components/Layouts/PageHeader";
import Base1Client from "./Base1Client";
import { Base1PipelineBoard } from "@/components/base1/Base1PipelineBoard";

// Hardcoded Base 1 Review Agent URL
const BASE1_AGENT_URL =
  "https://text-agent-template-672026052958.australia-southeast2.run.app/agent/base-1-review";

// Hardcoded Base 1 Review Agent Password
const BASE1_AGENT_PASSWORD = "CZA12!";

export default function Base1Page() {
  return (
    <>
      <PageHeader
        pageName="Base 1"
        title="Base 1 hub"
        description="Run Base 1 reviews, track leads, and open reports from a single workspace."
      />

      <div className="mt-6 space-y-10">
        {/* Review Agent section */}
        <section aria-labelledby="base1-review-agent-heading" className="space-y-4">
          <div>
            <h2
              id="base1-review-agent-heading"
              className="text-lg font-semibold text-dark dark:text-white"
            >
              Review Agent
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View recent Base 1 runs, start a new Utility Bill review, or open the Base 1 chat
              agent.
            </p>
          </div>
          <Base1Client base1Url={BASE1_AGENT_URL} base1Password={BASE1_AGENT_PASSWORD} />
        </section>

        {/* Lead Pipeline section */}
        <section id="pipeline" aria-labelledby="base1-pipeline-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2
                id="base1-pipeline-heading"
                className="text-lg font-semibold text-dark dark:text-white"
              >
                Lead Pipeline
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Drag leads between stages as you work them through the Base 1 pipeline.
              </p>
            </div>
          </div>
          <Base1PipelineBoard />
        </section>

        {/* Reports section */}
        <section aria-labelledby="base1-reports-heading" className="space-y-4">
          <div>
            <h2
              id="base1-reports-heading"
              className="text-lg font-semibold text-dark dark:text-white"
            >
              Reports
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Open Base 1 / lead reports in a full-page view for deeper analysis.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/reports"
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-gray-100 dark:hover:bg-dark-3"
            >
              Base 1 / Lead Reports
            </Link>
            <Link
              href="/reports/activities"
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-gray-100 dark:hover:bg-dark-3"
            >
              Activity report
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

