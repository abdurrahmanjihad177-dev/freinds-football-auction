 import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import ParticipantDashboard from "./ParticipantDashboard";
import "./App.css";

function App() {
  // ================================
  // RESTORE LOGIN AFTER REFRESH
  // ================================

  const savedSession = JSON.parse(
    localStorage.getItem("auctionSession") || "null"
  );

  const [screen, setScreen] = useState(
    savedSession?.screen || "login"
  );

  const [adminName, setAdminName] = useState(
    savedSession?.adminName || ""
  );

  const [teamName, setTeamName] = useState(
    savedSession?.teamName || ""
  );

  const [captainName, setCaptainName] = useState(
    savedSession?.captainName || ""
  );

  // ================================
  // SAVE SESSION
  // ================================

  const saveSession = (session) => {
    localStorage.setItem(
      "auctionSession",
      JSON.stringify(session)
    );
  };

  // ================================
  // ADMIN LOGIN
  // ================================

  const handleAdminLogin = (e) => {
    e.preventDefault();

    const name = adminName.trim();

    if (!name) {
      alert("Please enter admin name.");
      return;
    }

    setAdminName(name);
    setScreen("admin");

    saveSession({
      screen: "admin",
      adminName: name,
      teamName: "",
      captainName: "",
    });
  };

  // ================================
  // PARTICIPANT LOGIN
  // ================================

  const handleParticipantLogin = (e) => {
    e.preventDefault();

    const team = teamName.trim();
    const captain = captainName.trim();

    if (!team || !captain) {
      alert(
        "Please enter Team Name and Captain Name."
      );
      return;
    }

    setTeamName(team);
    setCaptainName(captain);
    setScreen("participant");

    saveSession({
      screen: "participant",
      adminName: "",
      teamName: team,
      captainName: captain,
    });
  };

  // ================================
  // LOGOUT
  // ================================

  const logout = () => {
    localStorage.removeItem("auctionSession");

    setAdminName("");
    setTeamName("");
    setCaptainName("");
    setScreen("login");
  };

  // ================================
  // ADMIN DASHBOARD
  // ================================

  if (screen === "admin") {
    return (
      <AdminDashboard
        adminName={adminName}
        onLogout={logout}
      />
    );
  }

  // ================================
  // PARTICIPANT DASHBOARD
  // ================================

  if (screen === "participant") {
    return (
      <ParticipantDashboard
        teamName={teamName}
        captainName={captainName}
        onLogout={logout}
      />
    );
  }

  // ================================
  // LOGIN PAGE
  // ================================

  return (
    <div className="app-page">
      <div className="login-card">

        {/* BRAND */}

        <div className="login-brand">
          <span>FRIENDS FOOTBALL</span>
          <strong>AUCTION</strong>
        </div>

        {/* HEADING */}

        <div className="login-heading">
          <p>LIVE FOOTBALL AUCTION</p>

          <h1>Welcome</h1>

          <span>
            Choose your access and join the auction.
          </span>
        </div>

        {/* ================================
            ADMIN
        ================================= */}

        <form
          className="login-form"
          onSubmit={handleAdminLogin}
        >
          <div className="login-title">
            ADMIN ACCESS
          </div>

          <label>ADMIN NAME</label>

          <input
            type="text"
            placeholder="Enter admin name"
            value={adminName}
            onChange={(e) =>
              setAdminName(e.target.value)
            }
          />

          <button
            type="submit"
            className="admin-login-button"
          >
            ADMIN LOGIN
            <span>→</span>
          </button>
        </form>

        {/* DIVIDER */}

        <div className="login-divider">
          <span>OR</span>
        </div>

        {/* ================================
            PARTICIPANT
        ================================= */}

        <form
          className="login-form"
          onSubmit={handleParticipantLogin}
        >
          <div className="login-title">
            PARTICIPANT ACCESS
          </div>

          <label>TEAM NAME</label>

          <input
            type="text"
            placeholder="Enter team name"
            value={teamName}
            onChange={(e) =>
              setTeamName(e.target.value)
            }
          />

          <label>CAPTAIN NAME</label>

          <input
            type="text"
            placeholder="Enter captain name"
            value={captainName}
            onChange={(e) =>
              setCaptainName(e.target.value)
            }
          />

          <button
            type="submit"
            className="participant-login-button"
          >
            JOIN AUCTION
            <span>→</span>
          </button>
        </form>

        {/* FOOTER */}

        <div className="login-footer">
          FRIENDS FOOTBALL AUCTION
        </div>

      </div>
    </div>
  );
}

export default App;