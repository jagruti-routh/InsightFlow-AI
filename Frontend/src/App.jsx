import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Meetings from "./pages/Meetings";
import Tasks from "./pages/Tasks";
import Decisions from "./pages/Decisions";
import Risks from "./pages/Risks";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import MeetingDetails from "./pages/MeetingDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Dashboard />} />

        <Route path="/meetings" element={<Meetings />} />
        <Route
          path="/meetings/:meetingId"
          element={<MeetingDetails />}
        />

        <Route path="/tasks" element={<Tasks />} />

        <Route path="/decisions" element={<Decisions />} />

        <Route path="/risks" element={<Risks />} />

        <Route path="/reports" element={<Reports />} />

        <Route path="/settings" element={<Settings />} />

        {/* Unknown URL → Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;