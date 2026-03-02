"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-12 p-6">
      <h1 className="text-heading-4 text-dark dark:text-white">
        Design System — Phase 1
      </h1>

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
