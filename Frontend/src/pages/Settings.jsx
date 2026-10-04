import DashboardLayout from "../layouts/DashboardLayout";

function Settings() {
  return (
    <DashboardLayout>

      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>
            Manage your InsightFlow AI workspace.
          </p>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="empty-state">
          Settings workspace
        </div>
      </div>

    </DashboardLayout>
  );
}

export default Settings;