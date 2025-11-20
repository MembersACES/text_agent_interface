"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/utils";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  status: string;
  assigned_to: string;
  assigned_by: string;
  business_id?: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  email: string;
  name?: string;
  full_name?: string;
}

export default function TasksPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [assignedToError, setAssignedToError] = useState<string | null>(null);
  
  // Form state for creating tasks
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    assigned_to: "",
    business_id: "",
  });

  // Fetch tasks assigned to current user
  const fetchTasks = async () => {
    if (!token) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${getApiBaseUrl()}/api/tasks/my`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to fetch tasks");
      }

      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(err.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  // Fetch users from API
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
          "Authorization": `Bearer ${token}`,
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
        throw new Error(errorData.detail || errorData.message || "Failed to fetch users");
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

  // Fetch users when modal opens
  useEffect(() => {
    if (showCreateModal && token) {
      fetchUsers();
    }
  }, [showCreateModal, token]);

  // Get user display name (name first, fallback to email)
  const getUserDisplayName = (email: string): string => {
    const user = users.find(u => u.email === email);
    if (user) {
      return user.name || user.full_name || email;
    }
    return email;
  };

  // Mark task as completed
  const handleMarkCompleted = async (taskId: number) => {
    if (!token) {
      setError("Authentication required. Please log in.");
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to update task status");
      }

      // Refresh tasks list
      await fetchTasks();
    } catch (err: any) {
      console.error("Error updating task status:", err);
      setError(err.message || "Failed to update task status");
    }
  };

  // Handle create task form submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError("Authentication required. Please log in.");
      return;
    }

    // Validation
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
      setCreating(true);
      setError(null);

      const payload: any = {
        title: formData.title,
        description: formData.description || "",
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
      };

      if (formData.business_id && formData.business_id.trim()) {
        payload.business_id = parseInt(formData.business_id);
      }

      const response = await fetch(`${getApiBaseUrl()}/api/tasks`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        setCreating(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to create task");
      }

      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        due_date: "",
        assigned_to: "",
        business_id: "",
      });
      setAssignedToError(null);
      setShowCreateModal(false);
      
      // Refresh tasks list
      await fetchTasks();
    } catch (err: any) {
      console.error("Error creating task:", err);
      setError(err.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Breadcrumb pageName="My Tasks" />

      <div className="mt-4">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            My Tasks
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>New Task</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading tasks...</p>
          </div>
        )}

        {/* Tasks Table */}
        {!loading && tasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No tasks assigned to you.</p>
          </div>
        )}

        {!loading && tasks.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                          {task.description || "No description"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {getUserDisplayName(task.assigned_to)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatDate(task.due_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {task.status.toLowerCase() !== "completed" && (
                          <button
                            onClick={() => handleMarkCompleted(task.id)}
                            className="text-primary hover:text-primary/80 transition-colors"
                          >
                            Mark as completed
                          </button>
                        )}
                        {task.status.toLowerCase() === "completed" && (
                          <span className="text-gray-400">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateModal(false);
                setAssignedToError(null);
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
                    Create New Task
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setAssignedToError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateTask}>
                  <div className="space-y-4">
                    {/* Title */}
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

                    {/* Description */}
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

                    {/* Due Date */}
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

                    {/* Assigned To */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Assigned To <span className="text-red-500">*</span>
                        </label>
                        {session?.user?.email && !loadingUsers && !usersError && users.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const currentUser = users.find(u => u.email === session.user?.email);
                              if (currentUser) {
                                setFormData({ ...formData, assigned_to: currentUser.email });
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
                          <span className="text-sm text-gray-500 dark:text-gray-400">Loading users...</span>
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
                              setFormData({ ...formData, assigned_to: e.target.value });
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
                              setFormData({ ...formData, assigned_to: e.target.value });
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

                    {/* Business ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Business ID (Optional)
                      </label>
                      <input
                        type="number"
                        value={formData.business_id}
                        onChange={(e) =>
                          setFormData({ ...formData, business_id: e.target.value })
                        }
                        placeholder="Business ID"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setAssignedToError(null);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? "Creating..." : "Create Task"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

