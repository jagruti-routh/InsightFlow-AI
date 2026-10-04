import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function DashboardLayout({ children }) {
  return (
    <div className="app-shell">

      <Sidebar />

      <div className="main-area">

        <Topbar />

        <main className="page-content">
          {children}
        </main>

      </div>

    </div>
  );
}

export default DashboardLayout;