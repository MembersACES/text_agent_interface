"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "./icons";

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

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDotVisible, setIsDotVisible] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  // Fetch user's tasks
  const fetchTasks = async () => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/api/tasks/my`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        setTasks([]);
        return;
      }

      if (!response.ok) {
        setTasks([]);
        return;
      }

      const data = await response.json();
      const tasksList = Array.isArray(data) ? data : [];
      // Filter to show only pending and in_progress tasks, limit to 5 most recent
      const filteredTasks = tasksList
        .filter((task: Task) => 
          task.status.toLowerCase() !== "completed"
        )
        .sort((a: Task, b: Task) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5);
      
      setTasks(filteredTasks);
      
      // Show dot if there are pending/in-progress tasks
      setIsDotVisible(filteredTasks.length > 0);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks when dropdown opens or token is available
  useEffect(() => {
    if (isOpen && token) {
      fetchTasks();
    }
  }, [isOpen, token]);

  // Also fetch on mount if token is available
  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "No due date";
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `Due: ${day}/${month}/${year}`;
    } catch {
      return "No due date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "in_progress":
        return "text-blue-600 dark:text-blue-400";
      case "pending":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <Dropdown
      isOpen={isOpen}
      setIsOpen={(open) => {
        setIsOpen(open);

        if (setIsDotVisible) setIsDotVisible(false);
      }}
    >
      <DropdownTrigger
        className="grid size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
        aria-label="View Tasks"
      >
        <span className="relative">
          <BellIcon />

          {isDotVisible && (
            <span
              className={cn(
                "absolute right-0 top-0 z-1 size-2 rounded-full bg-red-light ring-2 ring-gray-2 dark:ring-dark-3",
              )}
            >
              <span className="absolute inset-0 -z-1 animate-ping rounded-full bg-red-light opacity-75" />
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? "end" : "center"}
        className="border border-stroke bg-white px-3.5 py-3 shadow-md dark:border-dark-3 dark:bg-gray-dark min-[350px]:min-w-[20rem]"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <span className="text-lg font-medium text-dark dark:text-white">
            My Tasks
          </span>
          {tasks.length > 0 && (
            <span className="rounded-md bg-primary px-[9px] py-0.5 text-xs font-medium text-white">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mb-3 px-2 py-4 text-center text-sm text-dark-5 dark:text-dark-6">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="mb-3 px-2 py-4 text-center text-sm text-dark-5 dark:text-dark-6">
            No pending tasks
          </div>
        ) : (
          <ul className="mb-3 max-h-[23rem] space-y-1.5 overflow-y-auto">
            {tasks.map((task) => (
              <li key={task.id} role="menuitem">
                <Link
                  href="/tasks"
                  onClick={() => setIsOpen(false)}
                  className="flex flex-col gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong className="block text-sm font-medium text-dark dark:text-white flex-1">
                      {task.title}
                    </strong>
                    <span className={cn("text-xs font-medium capitalize flex-shrink-0", getStatusColor(task.status))}>
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  {task.description && (
                    <span className="truncate text-xs text-dark-5 dark:text-dark-6">
                      {task.description}
                    </span>
                  )}
                  
                  <span className="text-xs text-dark-5 dark:text-dark-6">
                    {formatDate(task.due_date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/tasks"
          onClick={() => setIsOpen(false)}
          className="block rounded-lg border border-primary p-2 text-center text-sm font-medium tracking-wide text-primary outline-none transition-colors hover:bg-blue-light-5 focus:bg-blue-light-5 focus:text-primary focus-visible:border-primary dark:border-dark-3 dark:text-dark-6 dark:hover:border-dark-5 dark:hover:bg-dark-3 dark:hover:text-dark-7 dark:focus-visible:border-dark-5 dark:focus-visible:bg-dark-3 dark:focus-visible:text-dark-7"
        >
          See all tasks
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}
