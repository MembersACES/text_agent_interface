"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/Layouts/PageHeader";
import {
  StatCard,
  QuickActionRow,
  QuickActionList,
  SegmentedControl,
  PostureBadge,
  InsightCallout,
  PillarGrid,
  ProgressModuleRow,
  ActivityFeedItem,
  DemoFold,
} from "@/components/dashboard";
import { FileText, Users, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [segment, setSegment] = useState("a");

  return (
    <div className="space-y-10">
      <PageHeader
        pageName="Design system"
        title="Design System — Phase 2"
        description="UI primitives and Prograde-inspired dashboard components."
      />

      <Card>
        <CardHeader>
          <CardTitle>Dashboard components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Members" value={128} trend="12 won · 4 lost" icon={<Users />} accent="scope-2" />
            <StatCard label="Tasks" value={34} trend="3 overdue" icon={<FileText />} accent="primary" />
          </div>

          <QuickActionList className="max-w-md">
            <QuickActionRow href="/crm-members" icon={<Users />} label="Browse members" description="CRM pipeline" />
            <QuickActionRow href="/tasks" icon={<FileText />} label="All tasks" description="Track work" />
          </QuickActionList>

          <div className="flex flex-wrap items-center gap-4">
            <SegmentedControl
              options={[
                { value: "a", label: "Option A" },
                { value: "b", label: "Option B", sublabel: "Alt" },
              ]}
              value={segment}
              onChange={setSegment}
            />
            <PostureBadge variant="preview" />
            <PostureBadge variant="defensible" />
          </div>

          <InsightCallout title="Insight callout" icon={<AlertCircle className="text-semantic-flag" />} variant="warning">
            Used for task banners, drift warnings, and AI nudges.
          </InsightCallout>

          <PillarGrid
            items={[
              { id: "1", label: "Lead", percent: 42, icon: "📋", detail: "54 members" },
              { id: "2", label: "Qualified", percent: 28, status: "ok", icon: "✓" },
              { id: "3", label: "Offer sent", percent: 18, status: "flag", icon: "📤" },
              { id: "4", label: "Won", percent: 12, status: "ok", icon: "🏆" },
            ]}
          />

          <div className="max-w-md space-y-2">
            <ProgressModuleRow label="Data collected" percent={72} status="ok" />
            <ProgressModuleRow label="Analysis in progress" percent={45} status="flag" />
          </div>

          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-stroke dark:divide-dark-3">
                <ActivityFeedItem
                  icon={<FileText />}
                  title="Quote sent"
                  meta="Acme Corp · by morgan@acesolutions.com.au"
                  timestamp="2 Mar 2026"
                  href="/offers"
                  type="info"
                  highlighted
                />
              </ul>
            </CardContent>
          </Card>

          <DemoFold title="Demo fold" description="Collapsible training section">
            <p className="text-sm text-gray-600 dark:text-gray-400">Hidden demo content goes here.</p>
          </DemoFold>
        </CardContent>
      </Card>

      {/* Button */}
      <Card>
        <CardHeader>
          <CardTitle>Button</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              Variants
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              Sizes
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              States
            </p>
            <div className="flex flex-wrap gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button leftIcon={<span aria-hidden>→</span>}>
                With left icon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <Input label="Label" placeholder="Placeholder" />
          <Input label="With hint" hint="Optional helper text" />
          <Input label="With error" error="This field is required" />
          <Input placeholder="No label" />
        </CardContent>
      </Card>

      {/* Select */}
      <Card>
        <CardHeader>
          <CardTitle>Select</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <Select label="Choose one">
            <option value="">Select…</option>
            <option value="a">Option A</option>
            <option value="b">Option B</option>
          </Select>
          <Select label="With error" error="Please select a value">
            <option value="">Select…</option>
          </Select>
        </CardContent>
      </Card>

      {/* Textarea */}
      <Card>
        <CardHeader>
          <CardTitle>Textarea</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            label="Message"
            placeholder="Enter text…"
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <Card>
        <CardHeader>
          <CardTitle>Modal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Backdrop click and Escape close. Focus trap and aria-modal.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open modal (default size)
            </Button>
          </div>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Modal title"
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>Confirm</Button>
              </div>
            }
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Modal body content. Focus is trapped inside while open.
            </p>
          </Modal>
        </CardContent>
      </Card>

      {/* Spinner */}
      <Card>
        <CardHeader>
          <CardTitle>Spinner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <Spinner className="size-6" />
            <Spinner className="size-8 text-primary" />
            <Spinner className="size-4" aria-label="Loading data" />
          </div>
        </CardContent>
      </Card>

      {/* Badge */}
      <Card>
        <CardHeader>
          <CardTitle>Badge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge intent="success">Success</Badge>
            <Badge intent="warning">Warning</Badge>
            <Badge intent="danger">Danger</Badge>
            <Badge intent="info">Info</Badge>
            <Badge intent="neutral">Neutral</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
