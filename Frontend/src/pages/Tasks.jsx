import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Search, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { getMeetings, getTasks } from "../services/api";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      setError("");

      const meetings = await getMeetings();

      const taskResults = await Promise.all(
        meetings.map(async (meeting) => {
          try {
            const meetingTasks = await getTasks(meeting.meeting_id);

            return meetingTasks.map((task) => ({
              ...task,
              meeting_title: meeting.title,
              meeting_date: meeting.meeting_date,
            }));
          } catch {
            return [];
          }
        })
      );

      const allTasks = taskResults.flat();

      setTasks(allTasks);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setError("Unable to load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        !search ||
        task.task_title?.toLowerCase().includes(search) ||
        task.task_description?.toLowerCase().includes(search) ||
        task.assigned_to?.toString().toLowerCase().includes(search) ||
        task.meeting_title?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Status" ||
        task.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesPriority =
        priorityFilter === "All Priority" ||
        task.priority?.toLowerCase() === priorityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  function formatDate(date) {
    if (!date) return "Not specified";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getPriorityClass(priority) {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "priority-critical";

      case "high":
        return "priority-high";

      case "medium":
        return "priority-medium";

      case "low":
        return "priority-low";

      default:
        return "priority-medium";
    }
  }

  function getStatusClass(status) {
    switch (status?.toLowerCase()) {
      case "completed":
        return "task-status-completed";

      case "in progress":
        return "task-status-progress";

      case "pending":
        return "task-status-pending";

      default:
        return "task-status-pending";
    }
  }

  return (
    <DashboardLayout>

      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>
            Track action items identified from meetings.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="tasks-toolbar">

        <div className="tasks-search">
          <Search size={17} strokeWidth={1.8} />

          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>All Status</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
        >
          <option>All Priority</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

      </div>

      {/* Main task card */}
      <div className="tasks-card">

        <div className="tasks-card-header">

          <div>
            <div className="tasks-title-row">
              <div className="tasks-title-icon">
                <CheckSquare size={18} />
              </div>

              <div>
                <h2>Action Items</h2>
                <p>
                  Tasks extracted from recorded meetings
                </p>
              </div>
            </div>
          </div>

          <span className="tasks-count">
            {filteredTasks.length}
          </span>

        </div>

        {/* Loading */}
        {loading && (
          <div className="tasks-state">
            Loading tasks...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="tasks-state tasks-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredTasks.length === 0 && (
          <div className="tasks-state">
            No tasks found.
          </div>
        )}

        {/* Tasks */}
        {!loading && !error && filteredTasks.length > 0 && (
          <div className="task-list">

            {filteredTasks.map((task) => (
              <div
                className="task-row"
                key={task.task_id}
              >

                <div className="task-main">

                  <h3>
                    {task.task_title || "Untitled task"}
                  </h3>

                  <p>
                    {task.task_description ||
                      "No description available."}
                  </p>

                  <div className="task-meta">

                    <span>
                      Meeting:{" "}
                      <Link
                        to={`/meetings/${task.meeting_id}`}
                      >
                        {task.meeting_title ||
                          `Meeting #${task.meeting_id}`}
                      </Link>
                    </span>

                    <span>
                      Owner:{" "}
                      {task.assigned_to || "Not specified"}
                    </span>

                  </div>

                </div>

                <div className="task-right">

                  <span
                    className={`task-priority ${getPriorityClass(
                      task.priority
                    )}`}
                  >
                    {task.priority || "Medium"}
                  </span>

                  <span className="task-due">
                    Due: {formatDate(task.deadline)}
                  </span>

                  <span
                    className={`task-status ${getStatusClass(
                      task.status
                    )}`}
                  >
                    {task.status || "Pending"}
                  </span>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>

    </DashboardLayout>
  );
}

export default Tasks;