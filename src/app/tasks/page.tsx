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

interface TaskHistory {
  id: number;
  task_id: number;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  user_email: string;
  created_at: string;
}

type TaskFilter = "my" | "assigned_by_me" | "all";
type SortField = "title" | "description" | "assigned_to" | "due_date" | "status";
type SortOrder = "asc" | "desc";

export default function TasksPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("my");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [historyTaskId, setHistoryTaskId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [assignedToError, setAssignedToError] = useState<string | null>(null);
  
  // History state
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  // Form state for creating/editing tasks
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    assigned_to: "",
    business_id: "",
  });

  // Fetch tasks based on filter
  const fetchTasks = async () => {
    if (!token) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Determine endpoint based on filter
      let endpoint = "";
      if (filter === "my") {
        endpoint = "/api/tasks/my";
      } else if (filter === "assigned_by_me") {
        endpoint = "/api/tasks/assigned-by-me";
      } else if (filter === "all") {
        endpoint = "/api/tasks/all";
      }
      
      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
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
  }, [token, filter]);

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
    if ((showCreateModal || showEditModal) && token) {
      fetchUsers();
    }
  }, [showCreateModal, showEditModal, token]);

  // Check if user can edit a task
  const canEdit = (task: Task): boolean => {
    if (!session?.user?.email) return false;
    const userEmail = session.user.email;
    return userEmail === task.assigned_to || userEmail === task.assigned_by;
  };

  // Fetch task history
  const fetchHistory = async (taskId: number) => {
    if (!token) {
      setHistoryError("Authentication required. Please log in.");
      return;
    }

    try {
      setLoadingHistory(true);
      setHistoryError(null);
      
      const response = await fetch(`${getApiBaseUrl()}/api/tasks/${taskId}/history`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        setHistoryError("Session expired. Please log in again.");
        setLoadingHistory(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to fetch history");
      }

      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching history:", err);
      setHistoryError(err.message || "Failed to fetch history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open history modal
  const openHistoryModal = (taskId: number) => {
    setHistoryTaskId(taskId);
    setShowHistoryModal(true);
    fetchHistory(taskId);
  };

  // Open edit modal
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date ? task.due_date.split('T')[0] : "",
      assigned_to: task.assigned_to,
      business_id: task.business_id ? task.business_id.toString() : "",
    });
    setShowEditModal(true);
  };

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

  // Handle delete task
  const handleDeleteTask = async () => {
    if (!token || !deletingTask) {
      setError("Authentication required or task not selected.");
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`${getApiBaseUrl()}/api/tasks/${deletingTask.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        setDeleting(false);
        return;
      }

      if (response.status === 403) {
        setError("You don't have permission to delete this task.");
        setDeleting(false);
        setShowDeleteConfirm(false);
        setDeletingTask(null);
        return;
      }

      if (response.status === 404) {
        setError("Task not found. It may have already been deleted.");
        setDeleting(false);
        setShowDeleteConfirm(false);
        setDeletingTask(null);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to delete task");
      }

      // Close modal and refresh tasks list
      setShowDeleteConfirm(false);
      setDeletingTask(null);
      await fetchTasks();
    } catch (err: any) {
      console.error("Error deleting task:", err);
      setError(err.message || "Failed to delete task");
    } finally {
      setDeleting(false);
    }
  };

  // Open delete confirmation
  const openDeleteConfirm = (task: Task) => {
    setDeletingTask(task);
    setShowDeleteConfirm(true);
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

  // Handle edit task form submission
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !editingTask) {
      setError("Authentication required or task not selected.");
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
      setEditing(true);
      setError(null);

      const payload: any = {
        title: formData.title,
        description: formData.description || "",
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to,
      };

      if (formData.business_id && formData.business_id.trim()) {
        payload.business_id = parseInt(formData.business_id);
      } else {
        payload.business_id = null;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        setEditing(false);
        return;
      }

      if (response.status === 403) {
        setError("You don't have permission to edit this task.");
        setEditing(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to update task");
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
      setEditingTask(null);
      setShowEditModal(false);
      
      // Refresh tasks list and history if history modal is open
      await fetchTasks();
      if (historyTaskId === editingTask.id) {
        await fetchHistory(editingTask.id);
      }
    } catch (err: any) {
      console.error("Error updating task:", err);
      setError(err.message || "Failed to update task");
    } finally {
      setEditing(false);
    }
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sort tasks based on current sort state
  const getSortedTasks = (): Task[] => {
    if (!sortField) return tasks;

    return [...tasks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "description":
          aValue = (a.description || "").toLowerCase();
          bValue = (b.description || "").toLowerCase();
          break;
        case "assigned_to":
          aValue = getUserDisplayName(a.assigned_to).toLowerCase();
          bValue = getUserDisplayName(b.assigned_to).toLowerCase();
          break;
        case "due_date":
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Render sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="ml-1 text-gray-400">
          <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    
    return (
      <span className="ml-1">
        {sortOrder === "asc" ? (
          <svg className="w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </span>
    );
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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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

  const sortedTasks = getSortedTasks();

  return (
    <>
      <Breadcrumb pageName="My Tasks" />

      <div className="mt-4">
        {/* Header with Filter and Create Button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Tasks
            </h1>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as TaskFilter)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="my">My Tasks</option>
              <option value="assigned_by_me">Assigned By Me</option>
              <option value="all">All Tasks</option>
            </select>
          </div>
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
            <p className="text-gray-500">
              {filter === "my" && "No tasks assigned to you."}
              {filter === "assigned_by_me" && "You haven't assigned any tasks."}
              {filter === "all" && "No tasks found."}
            </p>
          </div>
        )}

        {!loading && tasks.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th 
                      onClick={() => handleSort("title")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                    >
                      <div className="flex items-center">
                        Title
                        <SortIndicator field="title" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("description")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                    >
                      <div className="flex items-center">
                        Description
                        <SortIndicator field="description" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("assigned_to")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                    >
                      <div className="flex items-center">
                        Assigned To
                        <SortIndicator field="assigned_to" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("due_date")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                    >
                      <div className="flex items-center">
                        Due Date
                        <SortIndicator field="due_date" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("status")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                    >
                      <div className="flex items-center">
                        Status
                        <SortIndicator field="status" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedTasks.map((task) => (
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
                        <div className="flex items-center gap-3">
                          {canEdit(task) && (
                            <button
                              onClick={() => openEditModal(task)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Edit task"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => openHistoryModal(task.id)}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title="View history"
                          >
                            History
                          </button>
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
                          {canEdit(task) && (
                            <button
                              onClick={() => openDeleteConfirm(task)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete task"
                            >
                              Delete
                            </button>
                          )}
                        </div>
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

        {/* Edit Task Modal */}
        {showEditModal && editingTask && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
                setAssignedToError(null);
                setEditingTask(null);
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
                    Edit Task
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setAssignedToError(null);
                      setEditingTask(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleEditTask}>
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
                        setShowEditModal(false);
                        setAssignedToError(null);
                        setEditingTask(null);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editing}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editing ? "Updating..." : "Update Task"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && historyTaskId && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowHistoryModal(false);
                setHistoryTaskId(null);
                setHistory([]);
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
                    Task History
                  </h2>
                  <button
                    onClick={() => {
                      setShowHistoryModal(false);
                      setHistoryTaskId(null);
                      setHistory([]);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading history...</p>
                  </div>
                ) : historyError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {historyError}
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No history available for this task.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {h.action}
                        </div>
                        {h.field && (
                          <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                            <span className="font-medium">{h.field}:</span>{" "}
                            <span className="text-red-600 dark:text-red-400">{h.old_value || "empty"}</span>{" "}
                            →{" "}
                            <span className="text-green-600 dark:text-green-400">{h.new_value || "empty"}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {getUserDisplayName(h.user_email)} — {formatDateTime(h.created_at)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && deletingTask && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDeleteConfirm(false);
                setDeletingTask(null);
              }
            }}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Delete Task
                  </h2>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletingTask(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                    disabled={deleting}
                  >
                    ×
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Are you sure you want to delete this task?
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {deletingTask.title}
                    </p>
                    {deletingTask.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {deletingTask.description}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-3">
                    This action cannot be undone.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletingTask(null);
                    }}
                    disabled={deleting}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteTask}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? "Deleting..." : "Delete Task"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}