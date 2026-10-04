import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

import {
  getMeetings,
  getTasks,
  getDecisions,
  getRisks,
  getInsights,
} from "../services/api";

function App() {
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [risks, setRisks] = useState([]);
  const [insights, setInsights] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const meetingData = await getMeetings();

        setMeetings(meetingData);

        // Use the latest processed meeting for AI dashboard data
        const latestProcessedMeeting = meetingData.find(
          (meeting) => meeting.meeting_status === "Processed"
        );

        if (latestProcessedMeeting) {
          const meetingId = latestProcessedMeeting.meeting_id;

          const [
            taskData,
            decisionData,
            riskData,
            insightData,
          ] = await Promise.all([
            getTasks(meetingId),
            getDecisions(meetingId),
            getRisks(meetingId),
            getInsights(meetingId),
          ]);

          setTasks(taskData || []);
          setDecisions(decisionData || []);
          setRisks(riskData || []);
          setInsights(insightData || []);
        }
      } catch (err) {
        console.error(err);
        setError(
          "Could not load InsightFlow AI dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const processedMeetings = meetings.filter(
    (meeting) => meeting.meeting_status === "Processed"
  );

  const processingMeetings = meetings.filter(
    (meeting) => meeting.meeting_status === "Processing"
  );

  const recentMeetings = meetings.slice(0, 5);

  const latestInsight = insights[0];

  const latestDecision = decisions[0];

  const latestRisk = risks[0];

  return (
    <DashboardLayout>
      <div className="dashboard-page">

        {/* HEADER */}
        <section className="dashboard-header">
          <div>
            <h1>Good evening, Jagruti 👋</h1>
            <p>
              Here's what's happening across your meeting
              intelligence workspace.
            </p>
          </div>

          <div className="dashboard-status">
            <span className="status-dot"></span>
            AI Meeting Intelligence Active
          </div>
        </section>

        {loading && (
          <div className="loading-card">
            Loading your meeting intelligence...
          </div>
        )}

        {error && (
          <div className="error-card">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* STAT CARDS */}
            <section className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon blue">◫</div>
                <div>
                  <span className="stat-label">
                    Total Meetings
                  </span>
                  <strong>{meetings.length}</strong>
                  <small>
                    Meetings recorded
                  </small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">✓</div>
                <div>
                  <span className="stat-label">
                    Pending Tasks
                  </span>
                  <strong>{tasks.length}</strong>
                  <small>
                    From latest meeting
                  </small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">◆</div>
                <div>
                  <span className="stat-label">
                    Decisions
                  </span>
                  <strong>{decisions.length}</strong>
                  <small>
                    Identified by AI
                  </small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">!</div>
                <div>
                  <span className="stat-label">
                    Open Risks
                  </span>
                  <strong>{risks.length}</strong>
                  <small>
                    Requiring attention
                  </small>
                </div>
              </div>

            </section>

            {/* MAIN GRID */}
            <section className="dashboard-grid">

              {/* RECENT MEETINGS */}
              <div className="dashboard-card meetings-card">
                <div className="card-header">
                  <div>
                    <h2>Recent Meetings</h2>
                    <p>
                      Your latest meetings from PostgreSQL
                    </p>
                  </div>

                  <button className="text-button">
                    View all →
                  </button>
                </div>

                <div className="meeting-list">

                  {recentMeetings.map((meeting) => (
                    <div
                      className="meeting-row"
                      key={meeting.meeting_id}
                    >
                      <div className="meeting-main">

                        <div className="meeting-icon">
                          🎙
                        </div>

                        <div>
                          <h3>{meeting.title}</h3>

                          <span className="meeting-date">
                            {meeting.meeting_date
                              ? new Date(
                                  meeting.meeting_date
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "Date unavailable"}
                          </span>

                        </div>
                      </div>

                      <div className="meeting-meta">

                        <span className="meeting-id">
                          #{meeting.meeting_id}
                        </span>

                        <span
                          className={`status-badge ${
                            meeting.meeting_status ===
                            "Processed"
                              ? "processed"
                              : meeting.meeting_status ===
                                "Processing"
                              ? "processing"
                              : "uploaded"
                          }`}
                        >
                          {meeting.meeting_status}
                        </span>

                      </div>
                    </div>
                  ))}

                </div>
              </div>

              {/* AI INSIGHTS */}
              <div className="dashboard-card insight-card">

                <div className="card-header">
                  <div>
                    <h2>AI Insights</h2>
                    <p>
                      Latest intelligence generated by Gemini
                    </p>
                  </div>

                  <span className="ai-badge">
                    ✦ AI
                  </span>
                </div>

                {latestInsight ? (
                  <div className="insight-content">

                    <div className="insight-summary">
                      {latestInsight.summary}
                    </div>

                    <div className="insight-tags">

                      {latestInsight.meeting_category && (
                        <span className="tag purple-tag">
                          {latestInsight.meeting_category}
                        </span>
                      )}

                      {latestInsight.sentiment && (
                        <span className="tag blue-tag">
                          {latestInsight.sentiment}
                        </span>
                      )}

                      {latestInsight.overall_priority && (
                        <span className="tag orange-tag">
                          {latestInsight.overall_priority}
                        </span>
                      )}

                    </div>

                  </div>
                ) : (
                  <div className="empty-state">
                    No AI insights available yet.
                  </div>
                )}

              </div>

            </section>

            {/* BOTTOM GRID */}
            <section className="bottom-grid">

              {/* TASKS */}
              <div className="dashboard-card">

                <div className="card-header">
                  <div>
                    <h2>Pending Tasks</h2>
                    <p>Actions identified from meetings</p>
                  </div>
                </div>

                {tasks.length > 0 ? (
                  tasks.slice(0, 3).map((task) => (
                    <div
                      className="action-item"
                      key={task.task_id}
                    >
                      <div className="action-icon task">
                        ✓
                      </div>

                      <div className="action-content">
                        <strong>
                          {task.task_title}
                        </strong>

                        <span>
                          {task.deadline
                            ? `Due ${new Date(
                                task.deadline
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                }
                              )}`
                            : "No deadline"}
                        </span>
                      </div>

                      <span className="priority-badge">
                        {task.priority_level}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    No pending tasks.
                  </div>
                )}

              </div>

              {/* DECISIONS */}
              <div className="dashboard-card">

                <div className="card-header">
                  <div>
                    <h2>Recent Decision</h2>
                    <p>Important decisions detected by AI</p>
                  </div>
                </div>

                {latestDecision ? (
                  <div className="decision-box">

                    <div className="decision-icon">
                      ◆
                    </div>

                    <div>
                      <strong>
                        {latestDecision.decision_text}
                      </strong>

                      <span>
                        {latestDecision.decision_category ||
                          "Strategy"}
                      </span>
                    </div>

                  </div>
                ) : (
                  <div className="empty-state">
                    No decisions detected.
                  </div>
                )}

              </div>

              {/* RISKS */}
              <div className="dashboard-card">

                <div className="card-header">
                  <div>
                    <h2>Open Risks</h2>
                    <p>Potential issues identified by AI</p>
                  </div>
                </div>

                {latestRisk ? (
                  <div className="risk-box">

                    <div className="risk-icon">
                      !
                    </div>

                    <div>
                      <strong>
                        {latestRisk.risk_description}
                      </strong>

                      <span>
                        Risk level:{" "}
                        {latestRisk.risk_level}
                      </span>
                    </div>

                  </div>
                ) : (
                  <div className="empty-state">
                    No open risks.
                  </div>
                )}

              </div>

            </section>

          </>
        )}

      </div>
    </DashboardLayout>
  );
}

export default App;