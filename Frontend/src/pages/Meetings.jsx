import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Search,
  Upload,
  X,
  Mic,
  FileAudio,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";

const API_BASE = "http://127.0.0.1:8000";

function Meetings() {
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    meeting_date: "",
    meeting_time: "",
    duration: "",
    uploaded_by: "1",
    num_speakers: "2",
    file: null,
  });

  const fetchMeetings = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/meetings`);

      if (!response.ok) {
        throw new Error("Failed to fetch meetings");
      }

      const data = await response.json();

      setMeetings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const matchesSearch =
        meeting.title
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        meeting.description
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        meeting.meeting_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [meetings, search, statusFilter]);

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return "—";

    const minutes = Number(duration);

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    return remaining
      ? `${hours}h ${remaining}m`
      : `${hours}h`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Processed":
        return "status-badge status-processed";

      case "Processing":
        return "status-badge status-processing";

      case "Failed":
        return "status-badge status-failed";

      default:
        return "status-badge";
    }
  };

  const handleFormChange = (event) => {
    const { name, value, files } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: files ? files[0] : value,
    }));
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    setUploadError("");
    setUploadSuccess(false);

    if (!form.file) {
      setUploadError("Please select an audio file.");
      return;
    }

    if (!form.title.trim()) {
      setUploadError("Please enter a meeting title.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("meeting_date", form.meeting_date);
      formData.append("meeting_time", form.meeting_time);
      formData.append("duration", form.duration);
      formData.append("uploaded_by", form.uploaded_by);
      formData.append("num_speakers", form.num_speakers);
      formData.append("file", form.file);

      const response = await fetch(
        `${API_BASE}/meetings/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Meeting upload failed."
        );
      }

      setUploadSuccess(true);

      await fetchMeetings();

      setTimeout(() => {
        setShowUpload(false);
        setUploadSuccess(false);

        setForm({
          title: "",
          description: "",
          meeting_date: "",
          meeting_time: "",
          duration: "",
          uploaded_by: "1",
          num_speakers: "2",
          file: null,
        });
      }, 1200);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header meetings-header">
        <div>
          <h2>Meetings</h2>
          <p>
            Manage and review your recorded meetings.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setShowUpload(true);
            setUploadError("");
            setUploadSuccess(false);
          }}
        >
          <Upload size={17} />
          Upload Meeting
        </button>
      </div>

      <div className="meeting-toolbar">
        <div className="meeting-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search meetings..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="status-filter"
        >
          <option value="All">All Status</option>
          <option value="Processed">Processed</option>
          <option value="Processing">Processing</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      <section className="meetings-card">
        <div className="meetings-card-header">
          <div>
            <h3>All Meetings</h3>
            <span>
              {filteredMeetings.length} meetings found
            </span>
          </div>

          <div className="meeting-count">
            {meetings.length}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader2
              size={28}
              className="loading-spinner"
            />

            <strong>Loading meetings...</strong>

            <span>
              Fetching your meeting intelligence workspace.
            </span>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={36} />

            <h3>No meetings found</h3>

            <p>
              Try another search or upload a new meeting.
            </p>
          </div>
        ) : (
          <div className="meeting-list">
            {filteredMeetings.map((meeting) => (
              <button
                className="meeting-row"
                key={meeting.meeting_id}
                onClick={() =>
                  navigate(
                    `/meetings/${meeting.meeting_id}`
                  )
                }
              >
                <div className="meeting-icon">
                  <Mic size={18} />
                </div>

                <div className="meeting-main">
                  <h4>{meeting.title}</h4>

                  <div className="meeting-meta">
                    <span>
                      <CalendarDays size={14} />
                      {formatDate(meeting.meeting_date)}
                    </span>

                    {meeting.duration && (
                      <span>
                        <Clock3 size={14} />
                        {formatDuration(
                          meeting.duration
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="meeting-right">
                  <span className="meeting-id">
                    #{meeting.meeting_id}
                  </span>

                  <span
                    className={getStatusClass(
                      meeting.meeting_status
                    )}
                  >
                    {meeting.meeting_status ===
                      "Processed" && (
                      <CheckCircle2 size={13} />
                    )}

                    {meeting.meeting_status ===
                      "Processing" && (
                      <Loader2 size={13} />
                    )}

                    {meeting.meeting_status ===
                      "Failed" && (
                      <AlertCircle size={13} />
                    )}

                    {meeting.meeting_status}
                  </span>

                  <ChevronRight
                    size={18}
                    className="meeting-arrow"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {showUpload && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !uploading
            ) {
              setShowUpload(false);
            }
          }}
        >
          <div className="upload-modal">
            <div className="upload-modal-header">
              <div>
                <div className="upload-title-icon">
                  <Upload size={19} />
                </div>

                <div>
                  <h3>Upload Meeting</h3>
                  <p>
                    Add a recorded meeting for AI analysis.
                  </p>
                </div>
              </div>

              <button
                className="icon-button"
                onClick={() =>
                  !uploading && setShowUpload(false)
                }
                disabled={uploading}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Meeting Title *</label>

                  <input
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="e.g. Q3 Strategy Meeting"
                    required
                  />
                </div>

                <div className="form-field full-width">
                  <label>Description</label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Brief description of the meeting..."
                    rows="3"
                  />
                </div>

                <div className="form-field">
                  <label>Meeting Date</label>

                  <input
                    type="date"
                    name="meeting_date"
                    value={form.meeting_date}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-field">
                  <label>Meeting Time</label>

                  <input
                    type="time"
                    name="meeting_time"
                    value={form.meeting_time}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-field">
                  <label>Duration (minutes)</label>

                  <input
                    type="number"
                    name="duration"
                    value={form.duration}
                    onChange={handleFormChange}
                    placeholder="e.g. 45"
                    min="1"
                  />
                </div>

                <div className="form-field">
                  <label>Number of Speakers</label>

                  <input
                    type="number"
                    name="num_speakers"
                    value={form.num_speakers}
                    onChange={handleFormChange}
                    min="1"
                    max="20"
                  />
                </div>

                <div className="form-field full-width">
                  <label>Meeting Audio *</label>

                  <label className="file-dropzone">
                    <FileAudio size={30} />

                    {form.file ? (
                      <>
                        <strong>
                          {form.file.name}
                        </strong>

                        <span>
                          Click to change file
                        </span>
                      </>
                    ) : (
                      <>
                        <strong>
                          Choose an audio file
                        </strong>

                        <span>
                          WAV or MP3 supported
                        </span>
                      </>
                    )}

                    <input
                      type="file"
                      name="file"
                      accept=".wav,.mp3,audio/wav,audio/mpeg"
                      onChange={handleFormChange}
                      hidden
                    />
                  </label>
                </div>
              </div>

              {uploadError && (
                <div className="upload-message error">
                  <AlertCircle size={17} />
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="upload-message success">
                  <CheckCircle2 size={17} />
                  Meeting uploaded successfully! AI processing
                  has started.
                </div>
              )}

              <div className="upload-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowUpload(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2
                        size={17}
                        className="loading-spinner"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload size={17} />
                      Upload & Analyze
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Meetings;