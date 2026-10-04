import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Search,
  AlertCircle,
  FileDown,
  Plus,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  getMeetings,
  getReports,
  generateReport,
  getReportDownloadUrl,
} from "../services/api";

function Reports() {
  const [reports, setReports] = useState([]);
  const [meetings, setMeetings] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Generate report modal
  const [showGenerateModal, setShowGenerateModal] =
    useState(false);

  const [selectedMeeting, setSelectedMeeting] =
    useState("");

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const meetingsData = await getMeetings();

      setMeetings(meetingsData);

      const reportResults = await Promise.all(
        meetingsData.map(async (meeting) => {
          try {
            const meetingReports = await getReports(
              meeting.meeting_id
            );

            return meetingReports.map((report) => ({
              ...report,
              meeting_title: meeting.title,
              meeting_date: meeting.meeting_date,
            }));
          } catch {
            return [];
          }
        })
      );

      setReports(reportResults.flat());
    } catch (err) {
      console.error("Failed to load reports:", err);

      setError(
        "Unable to load reports. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!selectedMeeting) {
      setGenerateError("Please select a meeting.");
      return;
    }

    try {
      setGenerating(true);
      setGenerateError("");
      setSuccessMessage("");

      await generateReport(Number(selectedMeeting));

      setSuccessMessage(
        "Report generated successfully."
      );

      // Refresh report list
      await loadReports();

      // Close modal shortly after successful generation
      setTimeout(() => {
        setShowGenerateModal(false);
        setSelectedMeeting("");
        setSuccessMessage("");
      }, 1200);
    } catch (err) {
      console.error(
        "Failed to generate report:",
        err
      );

      setGenerateError(
        err.message ||
          "Unable to generate report. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }

  function closeGenerateModal() {
    if (generating) return;

    setShowGenerateModal(false);
    setSelectedMeeting("");
    setGenerateError("");
    setSuccessMessage("");
  }

  const reportTypes = useMemo(() => {
    const uniqueTypes = reports
      .map((report) => report.report_type)
      .filter(Boolean);

    return ["All Types", ...new Set(uniqueTypes)];
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        !search ||
        report.report_name
          ?.toLowerCase()
          .includes(search) ||
        report.report_type
          ?.toLowerCase()
          .includes(search) ||
        report.meeting_title
          ?.toLowerCase()
          .includes(search);

      const matchesType =
        typeFilter === "All Types" ||
        report.report_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [reports, searchTerm, typeFilter]);

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

  function formatDateTime(date) {
    if (!date) return "Not specified";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>
            View and manage generated meeting reports.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() =>
            setShowGenerateModal(true)
          }
        >
          <Plus size={17} />
          Generate Report
        </button>
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
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>

        <select
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value)
          }
        >
          {reportTypes.map((type) => (
            <option key={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Main reports card */}
      <div className="tasks-card">
        <div className="tasks-card-header">
          <div className="tasks-title-row">
            <div className="tasks-title-icon">
              <FileText size={18} />
            </div>

            <div>
              <h2>Generated Reports</h2>
              <p>
                Reports generated from recorded meetings
              </p>
            </div>
          </div>

          <span className="tasks-count">
            {filteredReports.length}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="tasks-state">
            Loading reports...
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
          filteredReports.length === 0 && (
            <div className="tasks-state">
              No generated reports found.
            </div>
          )}

        {/* Reports */}
        {!loading &&
          !error &&
          filteredReports.length > 0 && (
            <div className="task-list">
              {filteredReports.map((report) => (
                <div
                  className="task-row report-row"
                  key={report.report_id}
                >
                  <div className="task-main">
                    <h3>
                      {report.report_name ||
                        "Untitled report"}
                    </h3>

                    <div className="task-meta">
                      <span>
                        Meeting:{" "}
                        <Link
                          to={`/meetings/${report.meeting_id}`}
                        >
                          {report.meeting_title ||
                            `Meeting #${report.meeting_id}`}
                        </Link>
                      </span>

                      <span>
                        Meeting Date:{" "}
                        {formatDate(
                          report.meeting_date
                        )}
                      </span>
                    </div>

                    <div className="task-meta">
                      <span>
                        Generated:{" "}
                        {formatDateTime(
                          report.generated_at
                        )}
                      </span>

                      <span>
                        Report Type:{" "}
                        {report.report_type ||
                          "Not specified"}
                      </span>
                    </div>
                  </div>

                  <div className="task-right">
                    <a
                      className="report-format report-download"
                      href={getReportDownloadUrl(report.report_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileDown size={15} />
                      {report.report_format || "PDF"}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div
          className="modal-overlay"
          onClick={closeGenerateModal}
        >
          <div
            className="generate-report-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>Generate Meeting Report</h2>
                <p>
                  Select a processed meeting to
                  generate its report.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeGenerateModal}
                disabled={generating}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <label htmlFor="meeting-select">
                Select Meeting
              </label>

              <select
                id="meeting-select"
                value={selectedMeeting}
                onChange={(event) => {
                  setSelectedMeeting(
                    event.target.value
                  );
                  setGenerateError("");
                }}
                disabled={generating}
              >
                <option value="">
                  Select a meeting
                </option>

                {meetings.map((meeting) => (
                  <option
                    key={meeting.meeting_id}
                    value={meeting.meeting_id}
                  >
                    {meeting.title} —{" "}
                    {formatDate(
                      meeting.meeting_date
                    )}
                  </option>
                ))}
              </select>

              <label>Report Format</label>

              <div className="report-format-option">
                <FileText size={17} />
                <span>PDF Meeting Report</span>
              </div>

              {generateError && (
                <div className="generate-error">
                  <AlertCircle size={18} />
                  <span>{generateError}</span>
                </div>
              )}

              {successMessage && (
                <div className="generate-success">
                  <CheckCircle size={18} />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={closeGenerateModal}
                disabled={generating}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={handleGenerateReport}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2
                      size={17}
                      className="spin"
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText size={17} />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Reports;