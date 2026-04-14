import { PageHeader } from "@/components/Layouts/PageHeader";
import RobotDataHubClient from "./RobotDataHubClient";

export default function RobotDashboardPage() {
  return (
    <>
      <PageHeader
        pageName="Robot Dashboard"
        description="Browse Pudu sites and robots, then open analytics — mode, paging, executions, and optional task definitions — without opening a member record."
      />
      <div className="mt-6">
        <RobotDataHubClient />
      </div>
    </>
  );
}
