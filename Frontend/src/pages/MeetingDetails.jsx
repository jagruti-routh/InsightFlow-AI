/*MeetingDetails.jsx*/ 

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Users,
  CheckSquare,
  GitBranch,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Target,
  FileText,
} from "lucide-react";

import { getSpeakerStats } from "../services/api";

const API_BASE = "http://127.0.0.1:8000";

function MeetingDetails() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [insight, setInsight] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [risks, setRisks] = useState([]);
  const [transcript, setTranscript] = useState(null);

  const [speakerStats, setSpeakerStats] = useState([]);
  const [speakerLoading, setSpeakerLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
  async function loadMeetingDetails() {
    try {
      setLoading(true);
      setError("");

      const startTime = Date.now();

      const [
        meetingRes,
        insightRes,
        tasksRes,
        decisionsRes,
        risksRes,
        transcriptRes,
        speakerStatsData,
      ] = await Promise.all([
        fetch(`${API_BASE}/meetings/${meetingId}`),
        fetch(`${API_BASE}/insights/${meetingId}`),
        fetch(`${API_BASE}/tasks/${meetingId}`),
        fetch(`${API_BASE}/decisions/${meetingId}`),
        fetch(`${API_BASE}/risks/${meetingId}`),
        fetch(`${API_BASE}/transcripts/${meetingId}`),
        getSpeakerStats(meetingId).catch(() => null),
      ]);

      if (!meetingRes.ok) {
        throw new Error("Meeting could not be loaded.");
      }

      const meetingData = await meetingRes.json();

      setMeeting(meetingData);

      /* -----------------------------
         AI INSIGHT
      ----------------------------- */

      if (insightRes.ok) {
        const insightData = await insightRes.json();

        setInsight(
          Array.isArray(insightData)
            ? insightData[0] || null
            : insightData
        );
      } else {
        setInsight(null);
      }

      /* -----------------------------
         TASKS
      ----------------------------- */

      setTasks(
        tasksRes.ok
          ? await tasksRes.json()
          : []
      );

      /* -----------------------------
         DECISIONS
      ----------------------------- */

      setDecisions(
        decisionsRes.ok
          ? await decisionsRes.json()
          : []
      );

      /* -----------------------------
         RISKS
      ----------------------------- */

      setRisks(
        risksRes.ok
          ? await risksRes.json()
          : []
      );

      /* -----------------------------
         TRANSCRIPT
      ----------------------------- */

      setTranscript(
        transcriptRes.ok
          ? await transcriptRes.json()
          : null
      );

      /* -----------------------------
        SPEAKER STATISTICS
      ----------------------------- */

      if (speakerStatsData?.speakers) {
        setSpeakerStats(speakerStatsData.speakers);
      } else {
        setSpeakerStats([]);
      }

      setSpeakerLoading(false);

      /* -----------------------------
         MINIMUM LOADING TIME
         3.5 SECONDS
      ----------------------------- */

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(
        3500 - elapsed,
        0
      );

      await new Promise((resolve) =>
        setTimeout(resolve, remainingTime)
      );

    } catch (err) {
      console.error(err);

      setSpeakerLoading(false);

      setError(
        err.message ||
        "Failed to load meeting."
      );
    } finally {
      setLoading(false);
    }
  }

  loadMeetingDetails();
}, [meetingId]);

  

  const transcriptSegments = useMemo(() => {
    if (!transcript) return [];

    return (
      transcript?.segments ||
      transcript?.speaker_segments ||
      transcript?.speakerSegments ||
      []
    );
  }, [transcript]);

  if (loading) {
    return (
      <div className="meeting-details-state">

        <div className="ai-loading-icon">
          <Sparkles size={28} />
        </div>

        <strong>
          Preparing meeting intelligence...
        </strong>

        <span>
          Analyzing transcript, tasks, decisions and risks.
        </span>

      </div>
    );
  }

  if (error) {
    return (
      <div className="meeting-details-state">
        <AlertTriangle size={30} />
        <strong>Unable to load meeting</strong>
        <span>{error}</span>

        <button
          className="secondary-button"
          onClick={() => navigate("/meetings")}
        >
          Back to Meetings
        </button>
      </div>
    );
  }

  if (!meeting) return null;

  const meetingTitle =
    meeting.title ||
    meeting.meeting_title ||
    "Untitled Meeting";

  const meetingStatus =
    meeting.status || "Processed";

  const meetingDate =
    meeting.meeting_date ||
    meeting.date;

  const meetingDuration =
    meeting.duration ?? 0;

  const speakerCount =
  speakerStats.length > 0
    ? speakerStats.length
    : meeting.num_speakers ??
      meeting.number_of_speakers ??
      meeting.speaker_count ??
      0;

  const summary =
    insight?.summary ||
    "No AI summary is available for this meeting.";

  const category =
    insight?.meeting_category ||
    "Not classified";

  const sentiment =
    insight?.sentiment ||
    "Not available";

  const priority =
    insight?.overall_priority ||
    "Not available";

  const confidence =
    insight?.confidence_score != null
      ? Math.round(Number(insight.confidence_score) * 100)
      : null;

  return (
    <div className="meeting-details-page">

      {/* HEADER */}
      <div className="meeting-details-header">

        <div>
          <button
            className="back-button"
            onClick={() => navigate("/meetings")}
          >
            <ArrowLeft size={17} />
            Back to Meetings
          </button>

          <div className="meeting-details-title-row">
            <div>
              <h1>{meetingTitle}</h1>

              <div className="meeting-details-meta">
                <span>
                  <CalendarDays size={14} />
                  {meetingDate || "Date unavailable"}
                </span>

                <span>
                  <Clock3 size={14} />
                  {meetingDuration} min
                </span>

                <span>
                  Meeting #{meeting.meeting_id || meetingId}
                </span>
              </div>
            </div>

            <span
              className={`details-status ${
                meetingStatus.toLowerCase() === "processed"
                  ? "processed"
                  : "processing"
              }`}
            >
              ● {meetingStatus}
            </span>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="meeting-kpi-grid">

        <div className="meeting-kpi-card blue">
          <div className="meeting-kpi-icon">
            <Clock3 size={19} />
          </div>

          <div>
            <span>Duration</span>
            <strong>{meetingDuration} min</strong>
          </div>
        </div>

        <div className="meeting-kpi-card purple">
          <div className="meeting-kpi-icon">
            <Users size={19} />
          </div>

          <div>
            <span>Speakers</span>
            <strong>{speakerCount}</strong>
          </div>
        </div>

        <div className="meeting-kpi-card blue">
          <div className="meeting-kpi-icon">
            <CheckSquare size={19} />
          </div>

          <div>
            <span>Tasks</span>
            <strong>{tasks.length}</strong>
          </div>
        </div>

        <div className="meeting-kpi-card green">
          <div className="meeting-kpi-icon">
            <GitBranch size={19} />
          </div>

          <div>
            <span>Decisions</span>
            <strong>{decisions.length}</strong>
          </div>
        </div>

        <div className="meeting-kpi-card orange">
          <div className="meeting-kpi-icon">
            <ShieldAlert size={19} />
          </div>

          <div>
            <span>Risks</span>
            <strong>{risks.length}</strong>
          </div>
        </div>

      </div>

      {/* SUMMARY + CONFIDENCE */}
      <div className="meeting-intelligence-grid">

        <section className="details-card summary-card">

          <div className="details-card-header">
            <div>
              <div className="section-icon purple-icon">
                <Sparkles size={17} />
              </div>

              <div>
                <h2>AI Meeting Summary</h2>
                <p>Generated by Gemini</p>
              </div>
            </div>
          </div>

          <div className="summary-block">
            {summary}
          </div>

          <div className="summary-tags">
            <span className="detail-tag purple">
              {category}
            </span>

            <span className="detail-tag blue">
              {sentiment}
            </span>

            <span className="detail-tag orange">
              {priority} Priority
            </span>
          </div>

        </section>

        <section className="details-card confidence-card">

          <div className="details-card-header">
            <div>
              <div className="section-icon blue-icon">
                <Target size={17} />
              </div>

              <div>
                <h2>AI Confidence</h2>
                <p>Analysis reliability</p>
              </div>
            </div>
          </div>

          <div className="confidence-value">
            {confidence != null ? `${confidence}%` : "—"}
          </div>

          <div className="confidence-track">
            <div
              className="confidence-fill"
              style={{
                width: `${confidence || 0}%`,
              }}
            />
          </div>

          <span className="confidence-caption">
            Based on transcript-supported AI analysis
          </span>

        </section>

      </div>

      {/* SPEAKERS + INTELLIGENCE */}
      <div className="meeting-analysis-grid">

        <section className="details-card">

          <div className="details-card-header">
            <div>
              <div className="section-icon blue-icon">
                <Users size={17} />
              </div>

              <div>
                <h2>Speaker Participation</h2>
                <p>Talk-time distribution</p>
              </div>
            </div>
          </div>

          {speakerStats.length > 0 ? (
            <div className="speaker-chart">

              {speakerStats.map((speaker) => (
                <div
                  className="speaker-row"
                  key={speaker.speaker}
                >
                  <div className="speaker-label">
                    <span>{speaker.speaker}</span>
                    <strong>
                      {speaker.percentage}%
                    </strong>
                  </div>

                  <div className="speaker-track">
                    <div
                      className="speaker-fill"
                      style={{
                        width: `${speaker.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

            </div>
          ) : (
            <div className="compact-empty">
              Speaker timing data is not available.
            </div>
          )}

        </section>

        <section className="details-card">

          <div className="details-card-header">
            <div>
              <div className="section-icon green-icon">
                <Sparkles size={17} />
              </div>

              <div>
                <h2>Meeting Intelligence</h2>
                <p>AI-generated overview</p>
              </div>
            </div>
          </div>

          <div className="intelligence-grid">

            <div>
              <span>Category</span>
              <strong>{category}</strong>
            </div>

            <div>
              <span>Sentiment</span>
              <strong>{sentiment}</strong>
            </div>

            <div>
              <span>Priority</span>
              <strong>{priority}</strong>
            </div>

            <div>
              <span>AI Confidence</span>
              <strong>
                {confidence != null
                  ? `${confidence}%`
                  : "—"}
              </strong>
            </div>

          </div>

        </section>

      </div>

      {/* ACTION ITEMS */}
      <section className="details-card full-details-card">

        <div className="details-card-header">
          <div>
            <div className="section-icon blue-icon">
              <CheckSquare size={17} />
            </div>

            <div>
              <h2>Action Items</h2>
              <p>Tasks identified from the meeting</p>
            </div>
          </div>

          <span className="section-count">
            {tasks.length}
          </span>
        </div>

        {tasks.length > 0 ? (
          <div className="action-items-list">

            {tasks.map((task) => (
              <div
                className="action-item-card"
                key={task.task_id}
              >
                <div className="action-item-main">

                  <strong>
                    {task.task_title ||
                      task.title ||
                      "Untitled task"}
                  </strong>

                  <p>
                    {task.task_description ||
                      task.description ||
                      "No description available."}
                  </p>

                </div>

                <div className="action-item-meta">

                  <span className="priority-pill high">
                    {task.priority_level ||
                      task.priority ||
                      "Normal"}
                  </span>

                  <span>
                    Due:{" "}
                    {task.deadline || "Not specified"}
                  </span>

                  <span>
                    {task.status || "Pending"}
                  </span>

                </div>
              </div>
            ))}

          </div>
        ) : (
          <div className="compact-empty">
            No action items were identified.
          </div>
        )}

      </section>

      {/* DECISION + RISK */}
      <div className="decision-risk-grid">

        <section className="details-card">

          <div className="details-card-header">
            <div>
              <div className="section-icon purple-icon">
                <GitBranch size={17} />
              </div>

              <div>
                <h2>Decision</h2>
                <p>Key decision identified by AI</p>
              </div>
            </div>
          </div>

          {decisions.length > 0 ? (
            <div className="decision-content">

              {decisions.map((decision) => (
                <div
                  className="decision-item"
                  key={decision.decision_id}
                >
                  <strong>
                    {decision.decision_text}
                  </strong>

                  <div>
                    <span>
                      {decision.decision_category ||
                        decision.category ||
                        "General"}
                    </span>

                    <span>
                      {decision.importance_level ||
                        decision.importance ||
                        "Normal"}
                    </span>
                  </div>
                </div>
              ))}

            </div>
          ) : (
            <div className="compact-empty">
              No decisions were identified.
            </div>
          )}

        </section>

        <section className="details-card">

          <div className="details-card-header">
            <div>
              <div className="section-icon orange-icon">
                <ShieldAlert size={17} />
              </div>

              <div>
                <h2>Risk</h2>
                <p>Potential issue identified by AI</p>
              </div>
            </div>
          </div>

          {risks.length > 0 ? (
            <div className="risk-content">

              {risks.map((risk) => (
                <div
                  className="risk-item"
                  key={risk.risk_id}
                >
                  <strong>
                    {risk.risk_description}
                  </strong>

                  <span className="risk-level">
                    {risk.risk_level || "Medium"} Risk
                  </span>

                  <p>
                    <b>Mitigation:</b>{" "}
                    {risk.mitigation_plan ||
                      risk.mitigation ||
                      "No mitigation plan available."}
                  </p>

                </div>
              ))}

            </div>
          ) : (
            <div className="compact-empty">
              No risks were identified.
            </div>
          )}

        </section>

      </div>

      {/* TRANSCRIPT */}
      <section className="details-card transcript-card">

        <button
          className="transcript-toggle"
          onClick={() =>
            setShowTranscript(!showTranscript)
          }
        >
          <div>
            <div className="section-icon gray-icon">
              <FileText size={17} />
            </div>

            <div>
              <h2>Transcript</h2>
              <p>Speaker-labelled meeting transcript</p>
            </div>
          </div>

          {showTranscript ? (
            <ChevronUp size={19} />
          ) : (
            <ChevronDown size={19} />
          )}
        </button>

        {showTranscript && (
          <div className="transcript-content">

            {transcriptSegments.length > 0 ? (
              transcriptSegments.map((segment, index) => (
                <div
                  className="transcript-row"
                  key={index}
                >
                  <strong>
                    {segment.speaker ||
                      segment.speaker_label ||
                      "Speaker"}
                  </strong>

                  <p>
                    {segment.text ||
                      segment.transcript ||
                      ""}
                  </p>
                </div>
              ))
            ) : transcript?.transcript_text ? (
              <div className="transcript-full-text">
                {transcript.transcript_text}
              </div>
            ) : (
              <p className="compact-empty">
                Transcript content is not available.
              </p>
            )}

          </div>
        )}

      </section>

    </div>
  );
}

export default MeetingDetails;