import { useEffect, useMemo, useState } from "react";
import {
  ShieldAlert,
  Search,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { getMeetings, getRisks } from "../services/api";

function Risks() {
  const [risks, setRisks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] =
    useState("All Risk Levels");
  const [statusFilter, setStatusFilter] =
    useState("All Status");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRisks();
  }, []);

  async function loadRisks() {
    try {
      setLoading(true);
      setError("");

      const meetings = await getMeetings();

      const riskResults = await Promise.all(
        meetings.map(async (meeting) => {
          try {
            const meetingRisks = await getRisks(
              meeting.meeting_id
            );

            return meetingRisks.map((risk) => ({
              ...risk,
              meeting_title: meeting.title,
              meeting_date: meeting.meeting_date,
            }));
          } catch {
            return [];
          }
        })
      );

      setRisks(riskResults.flat());
    } catch (err) {
      console.error("Failed to load risks:", err);
      setError(
        "Unable to load risks. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredRisks = useMemo(() => {
    return risks.filter((risk) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        !search ||
        risk.risk_description
          ?.toLowerCase()
          .includes(search) ||
        risk.mitigation
          ?.toLowerCase()
          .includes(search) ||
        risk.meeting_title
          ?.toLowerCase()
          .includes(search);

      const matchesLevel =
        levelFilter === "All Risk Levels" ||
        risk.risk_level?.toLowerCase() ===
          levelFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "All Status" ||
        risk.status?.toLowerCase() ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesLevel &&
        matchesStatus
      );
    });
  }, [
    risks,
    searchTerm,
    levelFilter,
    statusFilter,
  ]);

  function getRiskClass(level) {
    switch (level?.toLowerCase()) {
      case "critical":
        return "risk-critical";

      case "high":
        return "risk-high";

      case "medium":
        return "risk-medium";

      case "low":
        return "risk-low";

      default:
        return "risk-medium";
    }
  }

  function getStatusClass(status) {
    switch (status?.toLowerCase()) {
      case "open":
        return "risk-status-open";

      case "mitigated":
        return "risk-status-mitigated";

      case "closed":
        return "risk-status-closed";

      default:
        return "risk-status-open";
    }
  }

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

  return (
    <DashboardLayout>

      <div className="page-header">
        <div>
          <h1>Risks</h1>
          <p>
            Monitor potential issues identified by AI.
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
            placeholder="Search risks..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>

        <select
          value={levelFilter}
          onChange={(event) =>
            setLevelFilter(event.target.value)
          }
        >
          <option>All Risk Levels</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option>All Status</option>
          <option>Open</option>
          <option>Mitigated</option>
          <option>Closed</option>
        </select>

      </div>

      {/* Main risk card */}
      <div className="tasks-card">

        <div className="tasks-card-header">

          <div className="tasks-title-row">

            <div className="tasks-title-icon">
              <ShieldAlert size={18} />
            </div>

            <div>
              <h2>Identified Risks</h2>
              <p>
                Potential issues identified from recorded
                meetings
              </p>
            </div>

          </div>

          <span className="tasks-count">
            {filteredRisks.length}
          </span>

        </div>

        {/* Loading */}
        {loading && (
          <div className="tasks-state">
            Loading risks...
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
          filteredRisks.length === 0 && (
            <div className="tasks-state">
              No risks found.
            </div>
          )}

        {/* Risks */}
        {!loading &&
          !error &&
          filteredRisks.length > 0 && (
            <div className="task-list">

              {filteredRisks.map((risk) => (

                <div
                  className="task-row risk-row"
                  key={risk.risk_id}
                >

                  <div className="task-main">

                    <h3>
                      {risk.risk_description ||
                        "Risk description unavailable"}
                    </h3>

                    <p>
                      <strong>Mitigation:</strong>{" "}
                      {risk.mitigation ||
                        "No mitigation strategy specified."}
                    </p>

                    <div className="task-meta">

                      <span>
                        Meeting:{" "}
                        <Link
                          to={`/meetings/${risk.meeting_id}`}
                        >
                          {risk.meeting_title ||
                            `Meeting #${risk.meeting_id}`}
                        </Link>
                      </span>

                      <span>
                        Date:{" "}
                        {formatDate(risk.meeting_date)}
                      </span>

                    </div>

                  </div>

                  <div className="task-right">

                    <span
                      className={`task-priority ${getRiskClass(
                        risk.risk_level
                      )}`}
                    >
                      {risk.risk_level || "Medium"}
                    </span>

                    <span
                      className={`task-status ${getStatusClass(
                        risk.status
                      )}`}
                    >
                      {risk.status || "Open"}
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

export default Risks;