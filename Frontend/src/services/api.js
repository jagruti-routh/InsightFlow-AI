//api.js

const API_BASE_URL = "http://127.0.0.1:8000";

// Get all meetings
export async function getMeetings() {
  const response = await fetch(`${API_BASE_URL}/meetings`);

  if (!response.ok) {
    throw new Error("Failed to fetch meetings");
  }

  return response.json();
}

// Get one meeting
export async function getMeeting(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/meetings/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch meeting");
  }

  return response.json();
}

// Get tasks for a meeting
export async function getTasks(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/tasks/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return response.json();
}

// Get decisions for a meeting
export async function getDecisions(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/decisions/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch decisions");
  }

  return response.json();
}

// Get risks for a meeting
export async function getRisks(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/risks/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch risks");
  }

  return response.json();
}

// Get AI insights for a meeting
export async function getInsights(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/insights/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch insights");
  }

  return response.json();
}

// Get transcript for a meeting
export async function getTranscript(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/transcripts/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch transcript");
  }

  return response.json();
}

// Get meeting participants
export async function getMeetingParticipants(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/meeting-participants/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch meeting participants");
  }

  return response.json();
}

// Get speaker participation statistics
export async function getSpeakerStats(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/speaker-stats/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch speaker statistics");
  }

  return response.json();
}

// Get generated reports
export async function getReports(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/reports/${meetingId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch reports");
  }

  return response.json();
}

// Generate a meeting report
export async function generateReport(meetingId) {
  const response = await fetch(
    `${API_BASE_URL}/reports/${meetingId}/generate`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    let message = "Failed to generate report";

    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // Keep default error message
    }

    throw new Error(message);
  }

  return response.json();
}


// Get report download URL
export function getReportDownloadUrl(reportId) {
  return `${API_BASE_URL}/reports/download/${reportId}`;
}

export default API_BASE_URL;