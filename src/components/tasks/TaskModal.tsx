"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";

type TaskModalMode = "create" | "edit";

interface TaskModalInitialValues {
  title?: string;
  description?: string;
  due_date?: string;
  assigned_to?: string;
  business_id?: string;
  client_id?: string;
}

interface TaskModalProps {
  mode: TaskModalMode;
  initialValues?: TaskModalInitialValues;
  taskId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (savedTaskId: number) => Promise<void> | void;
  lockClient?: boolean;
  clientLabel?: string;
}

interface User {
  id: number;
  email: string;
  name?: string;
  full_name?: string;
}

interface ClientOption {
  id: number;
  business_name: string;
}

export function TaskModal({
  mode,
  initialValues,
  taskId,
  isOpen,
  onClose,
  onSaved,
  lockClient = false,
  clientLabel,
}: TaskModalProps) {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    assigned_to: "",
    business_id: "",
    client_id: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignedToError, setAssignedToError] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      due_date: initialValues?.due_date ?? "",
      assigned_to: initialValues?.assigned_to ?? "",
      business_id: initialValues?.business_id ?? "",
      client_id: initialValues?.client_id ?? initialValues?.business_id ?? "",
    });
    setError(null);
    setAssignedToError(null);
  }, [isOpen, initialValues]);

  const fetchUsers = async () => {
    if (!token) {
      setUsersError("Authentication required. Please log in.");
      return;
    }

    try {
      setLoadingUsers(true);
      setUsersError(null);

      const response = await fetch(`${getApiBaseUrl()}/api/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        setUsersError("Session expired. Please log in again.");
        setLoadingUsers(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || "Failed to fetch users",
        );
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setUsersError(err.message || "Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchClients = async () => {
    if (!token) {
      setClientsError("Authentication required. Please log in.");
      return;
    }

    try {
      setLoadingClients(true);
      setClientsError(null);

      const response = await fetch(`${getApiBaseUrl()}/api/clients`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        setClientsError("Session expired. Please log in again.");
        setLoadingClients(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || "Failed to fetch members",
        );
      }

      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching clients:", err);
      setClientsError(err.message || "Failed to fetch members");
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !token) return;
    fetchUsers();
    fetchClients();
  }, [isOpen, token]);

  const handleClose = () => {
    if (submitting) return;
    setAssignedToError(null);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Authentication required. Please log in.");
      return;
    }

    setAssignedToError(null);
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    if (!formData.assigned_to.trim()) {
      setAssignedToError("Assigned To is required");
      setError("Assigned To is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: any = {
        title: formData.title.trim(),
        description: formData.description || "",
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
      };

      if (formData.client_id && formData.client_id.trim()) {
        const linkedId = parseInt(formData.client_id, 10);
        payload.client_id = linkedId;
        payload.business_id = linkedId;
      } else {
        payload.client_id = null;
        payload.business_id = null;
      }

      let url = "";
      let method: "POST" | "PATCH" = "POST";

      if (mode === "create") {
        url = `${getApiBaseUrl()}/api/tasks`;
        method = "POST";
      } else {
        if (!taskId) {
          throw new Error("Task ID is required to edit task.");
        }
        url = `${getApiBaseUrl()}/api/tasks/${taskId}`;
        method = "PATCH";
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        setSubmitting(false);
        return;
      }

      if (response.status === 403) {
        setError("You don't have permission to modify this task.");
        setSubmitting(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || "Failed to save task",
        );
      }

      const saved = await response.json();

      const nextInitialClientId =
        mode === "create"
          ? initialValues?.client_id ?? initialValues?.business_id ?? ""
          : formData.client_id;

      setFormData({
        title: "",
        description: "",
        due_date: "",
        assigned_to: "",
        business_id: "",
        client_id: nextInitialClientId ?? "",
      });
      setAssignedToError(null);

      if (typeof saved?.id === "number") {
        await onSaved?.(saved.id);
      } else if (typeof taskId === "number") {
        await onSaved?.(taskId);
      } else {
        await onSaved?.(0);
      }

      onClose();
    } catch (err: any) {
      console.error("Error saving task:", err);
      setError(err.message || "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const resolvedClientLabel =
    clientLabel ?? (lockClient ? "Member" : "Linked member (optional)");

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {mode === "create" ? "Create New Task" : "Edit Task"}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Assigned To <span className="text-red-500">*</span>
                  </label>
                  {session?.user?.email &&
                    !loadingUsers &&
                    !usersError &&
                    users.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentUser = users.find(
                            (u) => u.email === session.user?.email,
                          );
                          if (currentUser) {
                            setFormData({
                              ...formData,
                              assigned_to: currentUser.email,
                            });
                            setAssignedToError(null);
                          }
                        }}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Assign to me
                      </button>
                    )}
                </div>
                {loadingUsers ? (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 flex items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Loading users...
                    </span>
                  </div>
                ) : usersError ? (
                  <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md bg-red-50 dark:bg-red-900/20">
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {usersError}. You can still enter an email manually.
                    </span>
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          assigned_to: e.target.value,
                        });
                        setAssignedToError(null);
                      }}
                      placeholder="Enter user email"
                      className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                ) : (
                  <>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          assigned_to: e.target.value,
                        });
                        setAssignedToError(null);
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${
                        assignedToError
                          ? "border-red-300 dark:border-red-600"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      required
                    >
                      <option value="">Select a user...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.email}>
                          {user.name || user.full_name || user.email}
                        </option>
                      ))}
                    </select>
                    {assignedToError && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {assignedToError}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {resolvedClientLabel}
                  </label>
                  {!lockClient && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Optional – link to a member
                    </span>
                  )}
                </div>
                {loadingClients ? (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 flex items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Loading members...
                    </span>
                  </div>
                ) : clientsError ? (
                  <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md bg-red-50 dark:bg-red-900/20">
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {clientsError}
                    </span>
                  </div>
                ) : (
                  <select
                    value={formData.client_id}
                    onChange={(e) =>
                      setFormData({ ...formData, client_id: e.target.value })
                    }
                    disabled={lockClient}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {lockClient ? "Not changeable" : "None"}
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.business_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? mode === "create"
                    ? "Creating..."
                    : "Updating..."
                  : mode === "create"
                  ? "Create Task"
                  : "Update Task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

