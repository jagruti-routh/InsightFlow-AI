/* Sidebar.jsx */

import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  GitBranch,
  ShieldAlert,
  FileText,
  Settings,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    label: "Meetings",
    icon: CalendarDays,
    path: "/meetings",
  },
  {
    label: "Tasks",
    icon: CheckSquare,
    path: "/tasks",
  },
  {
    label: "Decisions",
    icon: GitBranch,
    path: "/decisions",
  },
  {
    label: "Risks",
    icon: ShieldAlert,
    path: "/risks",
  },
  {
    label: "Reports",
    icon: FileText,
    path: "/reports",
  },
];

function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <div className="sidebar-brand">
          <img
            src="/insightflow-logo.png"
            alt="InsightFlow AI"
            className="sidebar-logo-image"
          />
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-title">WORKSPACE</p>

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          <Settings size={19} strokeWidth={1.8} />
          <span>Settings</span>
        </NavLink>

        <div className="sidebar-version">
          <span>InsightFlow AI</span>
          <span>v1.0</span>
        </div>
      </div>

    </aside>
  );
}

export default Sidebar;