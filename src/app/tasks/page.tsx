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

interface HistoryGroup {
  date: string;
  items: TaskHistory[];
}

interface HistoryResponse {
  items?: TaskHistory[];
  groups?: HistoryGroup[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  };
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
  
  // Tab state for Option 2
  const [activeTab, setActiveTab] = useState<'active' | 'due-soon' | 'completed' | 'all'>('active');
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [assignedToError, setAssignedToError] = useState<string | null>(null);
  
  // History state
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [historyGroups, setHistoryGroups] = useState<HistoryGroup[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  
  // Pagination state
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(20);
  const [historyPagination, setHistoryPagination] = useState<{
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  } | null>(null);
  
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

  // Fetch task history with pagination
  const fetchHistory = async (taskId: number, page: number = 1, pageSize: number = 20, filter?: string) => {
    if (!token) {
      setHistoryError("Authentication required. Please log in.");
      return;
    }

    try {
      setLoadingHistory(true);
      setHistoryError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      
      if (filter && filter !== "all") {
        params.append("filter", filter);
      }
      
      const response = await fetch(`${getApiBaseUrl()}/api/tasks/${taskId}/history?${params.toString()}`, {
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

      const data: HistoryResponse = await response.json();
      
      if (data.groups && Array.isArray(data.groups)) {
        setHistoryGroups(data.groups);
        const allItems = data.groups.flatMap(group => group.items);
        setHistory(allItems);
      } else if (data.items && Array.isArray(data.items)) {
        setHistory(data.items);
        const grouped = groupHistoryByDate(data.items);
        setHistoryGroups(
          Object.entries(grouped).map(([date, items]) => ({
            date,
            items,
          }))
        );
      } else {
        const items = Array.isArray(data) ? data : [];
        setHistory(items);
        const grouped = groupHistoryByDate(items);
        setHistoryGroups(
          Object.entries(grouped).map(([date, items]) => ({
            date,
            items,
          }))
        );
      }
      
      if (data.pagination) {
        setHistoryPagination(data.pagination);
      } else {
        setHistoryPagination({
          page,
          page_size: pageSize,
          total: history.length,
          has_next: false,
          has_prev: page > 1,
        });
      }
    } catch (err: any) {
      console.error("Error fetching history:", err);
      setHistoryError(err.message || "Failed to fetch history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistoryModal = (taskId: number) => {
    setHistoryTaskId(taskId);
    setShowHistoryModal(true);
    setHistoryFilter("all");
    setHistoryPage(1);
    fetchHistory(taskId, 1, historyPageSize, "all");
  };

  const handleHistoryPageChange = (newPage: number) => {
    if (historyTaskId) {
      setHistoryPage(newPage);
      fetchHistory(historyTaskId, newPage, historyPageSize, historyFilter);
      const historyContent = document.querySelector('[data-history-content]');
      if (historyContent) {
        historyContent.scrollTop = 0;
      }
    }
  };

  const handleHistoryFilterChange = (newFilter: string) => {
    setHistoryFilter(newFilter);
    setHistoryPage(1);
    if (historyTaskId) {
      fetchHistory(historyTaskId, 1, historyPageSize, newFilter);
    }
  };

  const groupHistoryByDate = (items: TaskHistory[]): { [key: string]: TaskHistory[] } => {
    const grouped: { [key: string]: TaskHistory[] } = {};
    
    items.forEach((item) => {
      const date = new Date(item.created_at);
      const dateKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    
    return grouped;
  };

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

  const getUserDisplayName = (email: string): string => {
    const user = users.find(u => u.email === email);
    if (user) {
      return user.name || user.full_name || email;
    }
    return email;
  };

  const formatActionName = (action: string): string => {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes("task_created") || actionLower === "created") {
      return "Task Created";
    }
    if (actionLower.includes("task_deleted") || actionLower === "deleted") {
      return "Task Deleted";
    }
    if (actionLower.includes("multiple") || actionLower.includes("batched")) {
      return "Multiple Fields Updated";
    }
    
    return action
      .split(/[_\-\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatFieldName = (field: string): string => {
    if (!field) return "";
    
    return field
      .split(/[_\-\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatMelbourneTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-AU", {
        timeZone: "Australia/Melbourne",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return new Date(dateString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const areItemsBatched = (items: TaskHistory[]): boolean => {
    if (items.length <= 1) return false;
    
    const sorted = [...items].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const firstTime = new Date(sorted[0].created_at).getTime();
    const fiveSeconds = 5000;
    
    return sorted.every(item => {
      const itemTime = new Date(item.created_at).getTime();
      return itemTime - firstTime <= fiveSeconds;
    });
  };

  const groupBatchedItems = (items: TaskHistory[]): (TaskHistory | TaskHistory[])[] => {
    if (items.length === 0) return [];
    
    const sorted = [...items].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const result: (TaskHistory | TaskHistory[])[] = [];
    let currentBatch: TaskHistory[] = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const prevTime = new Date(sorted[i - 1].created_at).getTime();
      const currTime = new Date(sorted[i].created_at).getTime();
      const timeDiff = currTime - prevTime;
      
      if (timeDiff <= 5000 && sorted[i].user_email === sorted[i - 1].user_email) {
        currentBatch.push(sorted[i]);
      } else {
        if (currentBatch.length > 1) {
          result.push(currentBatch);
        } else {
          result.push(currentBatch[0]);
        }
        currentBatch = [sorted[i]];
      }
    }
    
    if (currentBatch.length > 1) {
      result.push(currentBatch);
    } else {
      result.push(currentBatch[0]);
    }
    
    return result.reverse();
  };

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

      await fetchTasks();
    } catch (err: any) {
      console.error("Error updating task status:", err);
      setError(err.message || "Failed to update task status");
    }
  };

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

  const openDeleteConfirm = (task: Task) => {
    setDeletingTask(task);
    setShowDeleteConfirm(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
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

      setFormData({
        title: "",
        description: "",
        due_date: "",
        assigned_to: "",
        business_id: "",
      });
      setAssignedToError(null);
      setShowCreateModal(false);
      
      await fetchTasks();
    } catch (err: any) {
      console.error("Error creating task:", err);
      setError(err.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !editingTask) {
      setError("Authentication required or task not selected.");
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
      
      await fetchTasks();
      if (historyTaskId === editingTask.id) {
        await fetchHistory(editingTask.id, historyPage, historyPageSize, historyFilter);
      }
    } catch (err: any) {
      console.error("Error updating task:", err);
      setError(err.message || "Failed to update task");
    } finally {
      setEditing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

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

  // OPTION 2: Tab-based filtering functions
  const getTasksByTab = (): Task[] => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const sorted = getSortedTasks();
    
    switch (activeTab) {
      case 'active':
        return sorted.filter(t => 
          t.status.toLowerCase() !== 'completed'
        ).sort((a, b) => {
          // Sort by due date, earliest first
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
        
      case 'due-soon':
        return sorted.filter(t => {
          if (t.status.toLowerCase() === 'completed') return false;
          if (!t.due_date) return false;
          const dueDate = new Date(t.due_date);
          return dueDate >= now && dueDate <= sevenDaysFromNow;
        }).sort((a, b) => 
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        );
        
      case 'completed':
        return sorted.filter(t => 
          t.status.toLowerCase() === 'completed'
        ).sort((a, b) => {
          // Sort completed by due date, most recent first
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
        });
        
      case 'all':
      default:
        return sorted;
    }
  };

  // Get count for each tab
  const getTabCount = (tab: typeof activeTab): number => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    switch (tab) {
      case 'active':
        return tasks.filter(t => t.status.toLowerCase() !== 'completed').length;
      case 'due-soon':
        return tasks.filter(t => {
          if (t.status.toLowerCase() === 'completed') return false;
          if (!t.due_date) return false;
          const dueDate = new Date(t.due_date);
          return dueDate >= now && dueDate <= sevenDaysFromNow;
        }).length;
      case 'completed':
        return tasks.filter(t => t.status.toLowerCase() === 'completed').length;
      case 'all':
        return tasks.length;
    }
  };

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
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const formatHistoryValue = (value: string | null | undefined): string => {
    if (!value || value === "(none)") return value ?? "(none)";
    
    const datePattern = /^\d{4}-\d{2}-\d{2}/;
    if (datePattern.test(value)) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return formatDate(value);
        }
      } catch {
      }
    }
    
    return value;
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
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
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

        {/* OPTION 2: TAB-BASED VIEW */}
        {!loading && tasks.length > 0 && (
          <>
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === 'active'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  Active Tasks
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'active' 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {getTabCount('active')}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('due-soon')}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                    ${activeTab === 'due-soon'
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <span>🔔</span>
                  Due Soon (7 days)
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'due-soon'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {getTabCount('due-soon')}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === 'completed'
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  Completed
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {getTabCount('completed')}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('all')}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === 'all'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  All Tasks
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {getTabCount('all')}
                  </span>
                </button>
              </nav>
            </div>

            {/* Task Table with Tab Content */}
            {getTasksByTab().length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">
                  {activeTab === 'active' && "No active tasks. Great job! 🎉"}
                  {activeTab === 'due-soon' && "No tasks due in the next 7 days."}
                  {activeTab === 'completed' && "No completed tasks yet."}
                  {activeTab === 'all' && "No tasks found."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th 
                          onClick={() => handleSort("title")}
                          className="w-[25%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                        >
                          <div className="flex items-center">
                            Title
                            <SortIndicator field="title" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort("description")}
                          className="w-[30%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                        >
                          <div className="flex items-center">
                            Description
                            <SortIndicator field="description" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort("assigned_to")}
                          className="w-[15%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                        >
                          <div className="flex items-center">
                            Assigned
                            <SortIndicator field="assigned_to" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort("due_date")}
                          className="w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                        >
                          <div className="flex items-center">
                            Due
                            <SortIndicator field="due_date" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort("status")}
                          className="w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                        >
                          <div className="flex items-center">
                            Status
                            <SortIndicator field="status" />
                          </div>
                        </th>
                        <th className="w-[10%] px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {getTasksByTab().map((task) => {
                        // Check if task is overdue
                        const isOverdue = task.due_date && 
                          new Date(task.due_date) < new Date() && 
                          task.status.toLowerCase() !== 'completed';
                        
                        return (
                          <tr 
                            key={task.id} 
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800 group ${
                              task.status.toLowerCase() === 'completed' ? 'opacity-60' : ''
                            } ${isOverdue ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <div className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
                                task.status.toLowerCase() === 'completed' ? 'line-through' : ''
                              }`} title={task.title}>
                                {isOverdue && <span className="text-red-600 mr-1">⚠️</span>}
                                {task.title}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate" title={task.description || "No description"}>
                                {task.description || "No description"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 dark:text-white truncate" title={getUserDisplayName(task.assigned_to)}>
                                {getUserDisplayName(task.assigned_to).split('@')[0]}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                                {formatDate(task.due_date)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                                  task.status
                                )}`}
                                title={task.status}
                              >
                                {task.status === "completed" ? "✓" : task.status === "in_progress" ? "..." : "○"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {canEdit(task) && (
                                  <button
                                    onClick={() => openEditModal(task)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    title="Edit task"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => openHistoryModal(task.id)}
                                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                  title="View history"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                                {task.status.toLowerCase() !== "completed" && (
                                  <button
                                    onClick={() => handleMarkCompleted(task.id)}
                                    className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                    title="Mark as completed"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                                {canEdit(task) && (
                                  <button
                                    onClick={() => openDeleteConfirm(task)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Delete task"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
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
                setHistoryGroups([]);
                setHistoryFilter("all");
                setHistoryPage(1);
                setHistoryPagination(null);
              }
            }}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full flex flex-col"
              style={{ height: "85vh", maxHeight: "700px" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Task History
                  </h2>
                  <button
                    onClick={() => {
                      setShowHistoryModal(false);
                      setHistoryTaskId(null);
                      setHistory([]);
                      setHistoryGroups([]);
                      setHistoryFilter("all");
                      setHistoryPage(1);
                      setHistoryPagination(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
                
                {/* Filter Buttons */}
                {!loadingHistory && !historyError && (history.length > 0 || historyGroups.length > 0) && (
                  <div className="flex gap-2 flex-wrap items-center">
                    <button
                      onClick={() => handleHistoryFilterChange("all")}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        historyFilter === "all"
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      All {historyPagination && `(${historyPagination.total})`}
                    </button>
                    <button
                      onClick={() => handleHistoryFilterChange("created")}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        historyFilter === "created"
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Created
                    </button>
                    <button
                      onClick={() => handleHistoryFilterChange("updated")}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        historyFilter === "updated"
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Updated
                    </button>
                    <button
                      onClick={() => handleHistoryFilterChange("deleted")}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        historyFilter === "deleted"
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Deleted
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4" data-history-content>
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading history...</p>
                  </div>
                ) : historyError ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    {historyError}
                  </div>
                ) : historyGroups.length === 0 && history.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No history available for this task.</p>
                  </div>
                ) : (
                  <>
                    {historyGroups.length > 0 ? (
                      <ul className="space-y-2">
                        {[...historyGroups].reverse().map((group, groupIndex) => (
                          <li key={`${group.date}-${groupIndex}`}>
                            <div className="sticky top-0 bg-white dark:bg-gray-800 py-2 mb-2 z-10">
                              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {group.date}
                              </h3>
                            </div>
                            <ul className="space-y-1.5">
                              {groupBatchedItems([...group.items].sort((a, b) => 
                                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                              )).map((itemOrBatch, idx) => {
                                if (Array.isArray(itemOrBatch)) {
                                  const batch = itemOrBatch;
                                  const firstItem = batch[0];
                                  const itemsWithFields = batch.filter(h => h.field);
                                  const hasMultipleFields = itemsWithFields.length > 1;
                                  
                                  return (
                                    <li
                                      key={`batch-${firstItem.id}-${idx}`}
                                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                                            {hasMultipleFields ? "Multiple Fields Updated" : formatActionName(firstItem.action)}
                                          </div>
                                          
                                          {itemsWithFields.length > 0 ? (
                                            <div className="space-y-1.5">
                                              {itemsWithFields.map((h) => (
                                                <div key={h.id} className="text-sm">
                                                  <div className="text-gray-700 dark:text-gray-300">
                                                    <span className="font-medium">{formatFieldName(h.field || "(unknown field)")}:</span>{" "}
                                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                                      {formatHistoryValue(h.old_value)}
                                                    </span>{" "}
                                                    <span className="text-gray-400 dark:text-gray-500">→</span>{" "}
                                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                                      {formatHistoryValue(h.new_value)}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                              No field changes recorded.
                                            </div>
                                          )}
                                          
                                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            {getUserDisplayName(firstItem.user_email)}
                                          </div>
                                        </div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                                          {formatMelbourneTime(firstItem.created_at)}
                                        </div>
                                      </div>
                                    </li>
                                  );
                                }
                                
                                const h = itemOrBatch;
                                const fieldsArray = (h as any).fields;

                                return (
                                  <li
                                    key={h.id}
                                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                                          {formatActionName(h.action)}
                                        </div>

                                        {Array.isArray(fieldsArray) && fieldsArray.length > 0 ? (
                                          fieldsArray.map((f: any, idx: number) => (
                                            <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                              <span className="font-medium">{formatFieldName(f.field)}:</span>{" "}
                                              <span className="text-red-600 dark:text-red-400 font-medium">
                                                {formatHistoryValue(f.old_value)}
                                              </span>{" "}
                                              <span className="text-gray-400 dark:text-gray-500">→</span>{" "}
                                              <span className="text-green-600 dark:text-green-400 font-medium">
                                                {formatHistoryValue(f.new_value)}
                                              </span>
                                            </div>
                                          ))
                                        ) : h.field ? (
                                          <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                            <span className="font-medium">{formatFieldName(h.field)}:</span>{" "}
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {formatHistoryValue(h.old_value)}
                                            </span>{" "}
                                            <span className="text-gray-400 dark:text-gray-500">→</span>{" "}
                                            <span className="text-green-600 dark:text-green-400 font-medium">
                                              {formatHistoryValue(h.new_value)}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                            No field changes recorded.
                                          </div>
                                        )}

                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {getUserDisplayName(h.user_email)}
                                        </div>
                                      </div>

                                      <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                                        {formatMelbourneTime(h.created_at)}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      (() => {
                        const groupedHistory = groupHistoryByDate(history);
                        const dates = Object.keys(groupedHistory).sort((a, b) => {
                          return new Date(b).getTime() - new Date(a).getTime();
                        });

                        return (
                          <ul className="space-y-2">
                            {dates.map((date) => (
                              <li key={date}>
                                <div className="sticky top-0 bg-white dark:bg-gray-800 py-2 mb-2 z-10">
                                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {date}
                                  </h3>
                                </div>
                                <ul className="space-y-1.5">
                                  {groupBatchedItems(groupedHistory[date]).map((itemOrBatch, idx) => {
                                    if (Array.isArray(itemOrBatch)) {
                                      const batch = itemOrBatch;
                                      const firstItem = batch[0];
                                      const itemsWithFields = batch.filter(h => h.field);
                                      const hasMultipleFields = itemsWithFields.length > 1;
                                      
                                      return (
                                        <li
                                          key={`batch-${firstItem.id}-${idx}`}
                                          className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                              <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                                                {hasMultipleFields ? "Multiple Fields Updated" : formatActionName(firstItem.action)}
                                              </div>
                                              
                                              {itemsWithFields.length > 0 ? (
                                                <div className="space-y-1.5">
                                                  {itemsWithFields.map((h) => (
                                                    <div key={h.id} className="text-sm">
                                                      <div className="text-gray-700 dark:text-gray-300">
                                                        <span className="font-medium">{formatFieldName(h.field || "(unknown field)")}:</span>{" "}
                                                        <span className="text-red-600 dark:text-red-400 font-medium">
                                                          {formatHistoryValue(h.old_value)}
                                                        </span>{" "}
                                                        <span className="text-gray-400 dark:text-gray-500">→</span>{" "}
                                                        <span className="text-green-600 dark:text-green-400 font-medium">
                                                          {formatHistoryValue(h.new_value)}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                  No field changes recorded.
                                                </div>
                                              )}
                                              
                                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                {getUserDisplayName(firstItem.user_email)}
                                              </div>
                                            </div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                                              {formatMelbourneTime(firstItem.created_at)}
                                            </div>
                                          </div>
                                        </li>
                                      );
                                    }
                                    
                                    const h = itemOrBatch;
                                    const fieldsArray = (h as any).fields;

                                    return (
                                      <li
                                        key={h.id}
                                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                                              {formatActionName(h.action)}
                                            </div>

                                            {Array.isArray(fieldsArray) && fieldsArray.length > 0 ? (
                                              fieldsArray.map((f: any, idx: number) => (
                                                <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                                  <span className="font-medium">{formatFieldName(f.field)}:</span>{" "}
                                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                                    {formatHistoryValue(f.old_value)}
                                                  </span>{" "}
                                                  <span className="text-gray-400 dark:text-gray-500">→</span>{" "}
                                                  <span className="text-green-600 dark:text-green-400 font-medium">
                                                    {formatHistoryValue(f.new_value)}
                                                  </span>
                                                </div>
                                              ))
                                            ) : h.field ? (
                                              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                                <span className="font-medium">{formatFieldName(h.field)}:</span>{" "}
                                                <span className="text-red-600 dark:text-red-400 font-medium">
                                                  {formatHistoryValue(h.old_value)}
                                                </span>{" "}
                                                <span className="text-gray-400 dark:text-gray-500">→</span>{" "}
                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                  {formatHistoryValue(h.new_value)}
                                                </span>
                                              </div>
                                            ) : (
                                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                No field changes recorded.
                                              </div>
                                            )}

                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                              {getUserDisplayName(h.user_email)}
                                            </div>
                                          </div>

                                          <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                                            {formatMelbourneTime(h.created_at)}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        );
                      })()
                    )}
                  </>
                )}
              </div>

              {/* Pagination Controls */}
              {historyPagination && (historyPagination.has_next || historyPagination.has_prev) && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {historyPagination.page} of {Math.ceil(historyPagination.total / historyPagination.page_size)} 
                    {" "}({historyPagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleHistoryPageChange(historyPagination.page - 1)}
                      disabled={!historyPagination.has_prev || loadingHistory}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handleHistoryPageChange(historyPagination.page + 1)}
                      disabled={!historyPagination.has_next || loadingHistory}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
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