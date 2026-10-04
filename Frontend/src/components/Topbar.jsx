/* Topbar.jsx */

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Search,
  LogOut,
  User,
  X,
} from "lucide-react";

function Topbar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowProfile(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = (event) => {
    setSearch(event.target.value);
  };

  const clearSearch = () => {
    setSearch("");
  };

  const handleSignOut = () => {
    alert("Sign out functionality will be connected to authentication.");
  };

  return (
    <header className="topbar">

      {/* SEARCH */}
      <div className="topbar-search">
        <Search size={18} strokeWidth={1.8} />

        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search meetings, tasks, decisions..."
        />

        {search && (
          <button
            className="topbar-search-clear"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="topbar-actions">

        {/* NOTIFICATIONS */}
        <div className="topbar-dropdown-wrapper" ref={notificationRef}>
          <button
            className="notification-button"
            aria-label="Notifications"
            onClick={() =>
              setShowNotifications(!showNotifications)
            }
          >
            <Bell size={20} strokeWidth={1.8} />
            <span className="notification-dot"></span>
          </button>

          {showNotifications && (
            <div className="notification-dropdown">

              <div className="dropdown-header">
                <div>
                  <strong>Notifications</strong>
                  <span>3 new notifications</span>
                </div>
              </div>

              <div className="notification-item">
                <div className="notification-icon blue">
                  <Bell size={16} />
                </div>

                <div>
                  <strong>New meeting processed</strong>
                  <span>
                    Gemini testing has been successfully analyzed.
                  </span>
                  <small>Just now</small>
                </div>
              </div>

              <div className="notification-item">
                <div className="notification-icon purple">
                  <User size={16} />
                </div>

                <div>
                  <strong>2 action items identified</strong>
                  <span>
                    New tasks were extracted from your latest meeting.
                  </span>
                  <small>5 minutes ago</small>
                </div>
              </div>

              <div className="notification-item">
                <div className="notification-icon orange">
                  <Bell size={16} />
                </div>

                <div>
                  <strong>High priority risk detected</strong>
                  <span>
                    A new risk requires attention.
                  </span>
                  <small>12 minutes ago</small>
                </div>
              </div>

              <div className="dropdown-footer">
                View all notifications
              </div>

            </div>
          )}
        </div>

        <div className="topbar-divider"></div>

        {/* PROFILE */}
        <div className="topbar-dropdown-wrapper" ref={profileRef}>

          <button
            className="user-profile"
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className="user-avatar">
              JR
            </div>

            <div className="user-info">
              <strong>Jagruti Routh</strong>
              <span>Project Admin</span>
            </div>
          </button>

          {showProfile && (
            <div className="profile-dropdown">

              <div className="profile-dropdown-header">

                <div className="profile-large-avatar">
                  JR
                </div>

                <div>
                  <strong>Jagruti Routh</strong>
                  <span>Project Admin</span>
                </div>

              </div>

              <div className="profile-email">
                jagruti.routh@insightflow.ai
              </div>

              <div className="profile-divider"></div>

              <button className="profile-menu-item">
                <User size={17} />
                <span>My Profile</span>
              </button>

              <button
                className="profile-menu-item sign-out"
                onClick={handleSignOut}
              >
                <LogOut size={17} />
                <span>Sign out</span>
              </button>

            </div>
          )}

        </div>

      </div>

    </header>
  );
}

export default Topbar;