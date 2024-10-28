import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dashboard } from "../../../server/src/db/models/dashboards";
import api from "../api";
import NavBar from "../features/layout/NavBar";

function HomePage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    async function fetchDashboards() {
      const data = await api.get<Dashboard[]>("/dashboards");
      setDashboards(data);
    }

    fetchDashboards();
  }, []);

  const handleCreate = async () => {
    if (!name) {
      return;
    }

    const db = await api.post<Dashboard>("/dashboards", { name });
    setDashboards((prev) => [...prev, db]);
    setName("");
  };

  return (
    <div className="layout-wrapper">
      <aside>
        <NavBar />
      </aside>
      <main className="home-page">
        <h1>Dashboards</h1>
        <div className="dashboard-list">
          {dashboards.map((db) => (
            <div key={db.uuid} className="dashboard">
              <div className="top">
                <h3>{db.name}</h3>
              </div>
              <div className="bottom">
                <Link to={`/db/${db.uuid}`}>Open the dashboard →</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="db-form">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button
            className="primary"
            onClick={handleCreate}
            aria-label="Create dashboard"
            disabled={!name}
          >
            Create
          </button>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
