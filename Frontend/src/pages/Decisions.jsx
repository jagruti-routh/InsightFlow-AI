import { useEffect, useMemo, useState } from "react";
import {
  GitBranch,
  Search,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { getMeetings, getDecisions } from "../services/api";

function Decisions() {
  const [decisions, setDecisions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [importanceFilter, setImportanceFilter] =
    useState("All Importance");
  const [categoryFilter, setCategoryFilter] =
    useState("All Categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDecisions();
  }, []);

  async function loadDecisions() {
    try {
      setLoading(true);
      setError("");

      const meetings = await getMeetings();

      const decisionResults = await Promise.all(
        meetings.map(async (meeting) => {
          try {
            const meetingDecisions = await getDecisions(
              meeting.meeting_id
            );

            return meetingDecisions.map((decision) => ({
              ...decision,
              meeting_title: meeting.title,
              meeting_date: meeting.meeting_date,
            }));
          } catch {
            return [];
          }
        })
      );

      setDecisions(decisionResults.flat());
    } catch (err) {
      console.error("Failed to load decisions:", err);
      setError(
        "Unable to load decisions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const uniqueCategories = decisions
      .map((decision) => decision.category)
      .filter(Boolean);

    return ["All Categories", ...new Set(uniqueCategories)];
  }, [decisions]);

  const filteredDecisions = useMemo(() => {
    return decisions.filter((decision) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        !search ||
        decision.decision_text
          ?.toLowerCase()
          .includes(search) ||
        decision.category
          ?.toLowerCase()
          .includes(search) ||
        decision.meeting_title
          ?.toLowerCase()
          .includes(search);

      const matchesImportance =
        importanceFilter === "All Importance" ||
        decision.importance?.toLowerCase() ===
          importanceFilter.toLowerCase();

      const matchesCategory =
        categoryFilter === "All Categories" ||
        decision.category === categoryFilter;

      return (
        matchesSearch &&
        matchesImportance &&
        matchesCategory
      );
    });
  }, [
    decisions,
    searchTerm,
    importanceFilter,
    categoryFilter,
  ]);

  function getImportanceClass(importance) {
    switch (importance?.toLowerCase()) {
      case "critical":
        return "decision-critical";

      case "high":
        return "decision-high";

      case "medium":
        return "decision-medium";

      case "low":
        return "decision-low";

      default:
        return "decision-medium";
    }
  }

  return (
    <DashboardLayout>

      <div className="page-header">
        <div>
          <h1>Decisions</h1>
          <p>
            Review important decisions identified by AI.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="tasks-toolbar">

        <div className="tasks-search">
          <Search
            size={17}
            strokeWidth={1.8}
          />

          <input
            type="text"
            placeholder="Search decisions..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>

        <select
          value={importanceFilter}
          onChange={(event) =>
            setImportanceFilter(event.target.value)
          }
        >
          <option>All Importance</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value)
          }
        >
          {categories.map((category) => (
            <option key={category}>
              {category}
            </option>
          ))}
        </select>

      </div>

      {/* Main decision card */}
      <div className="tasks-card">

        <div className="tasks-card-header">

          <div className="tasks-title-row">

            <div className="tasks-title-icon">
              <GitBranch size={18} />
            </div>

            <div>
              <h2>Key Decisions</h2>
              <p>
                Decisions identified from recorded meetings
              </p>
            </div>

          </div>

          <span className="tasks-count">
            {filteredDecisions.length}
          </span>

        </div>

        {/* Loading */}
        {loading && (
          <div className="tasks-state">
            Loading decisions...
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
        {!loading &&
          !error &&
          filteredDecisions.length === 0 && (
            <div className="tasks-state">
              No decisions found.
            </div>
          )}

        {/* Decisions */}
        {!loading &&
          !error &&
          filteredDecisions.length > 0 && (
            <div className="task-list">

              {filteredDecisions.map((decision) => (

                <div
                  className="task-row decision-row"
                  key={decision.decision_id}
                >

                  <div className="task-main">

                    <h3>
                      {decision.decision_text ||
                        "Decision not available"}
                    </h3>

                    <div className="task-meta">

                      <span>
                        Category:{" "}
                        {decision.category ||
                          "Not specified"}
                      </span>

                      <span>
                        Meeting:{" "}
                        <Link
                          to={`/meetings/${decision.meeting_id}`}
                        >
                          {decision.meeting_title ||
                            `Meeting #${decision.meeting_id}`}
                        </Link>
                      </span>

                    </div>

                    <div className="task-meta">

                      <span>
                        Meeting Date:{" "}
                        {decision.meeting_date
                          ? new Date(
                              decision.meeting_date
                            ).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "Not specified"}
                      </span>

                    </div>

                  </div>

                  <div className="task-right">

                    <span
                      className={`task-priority ${getImportanceClass(
                        decision.importance
                      )}`}
                    >
                      {decision.importance ||
                        "Medium"}
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

export default Decisions;