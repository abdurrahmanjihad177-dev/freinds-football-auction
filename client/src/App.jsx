 import { useState } from "react";
import { io } from "socket.io-client";

import AdminDashboard from "./AdminDashboard";
import ParticipantDashboard from "./ParticipantDashboard";

import "./App.css";

// =====================================
// SOCKET
// =====================================

const SERVER_URL =
  "https://freinds-football-auction-1.onrender.com";

const socket = io(SERVER_URL, {
  transports: ["polling", "websocket"],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

// =====================================
// RESTORE SESSION
// =====================================

const getSavedSession = () => {
  try {
    const saved =
      localStorage.getItem(
        "auctionSession"
      );

    if (!saved) {
      return null;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error(
      "Session restore error:",
      error
    );

    localStorage.removeItem(
      "auctionSession"
    );

    return null;
  }
};

function App() {
  const savedSession =
    getSavedSession();

  const [screen, setScreen] =
    useState(
      savedSession?.screen ||
        "login"
    );

  const [adminName, setAdminName] =
    useState(
      savedSession?.adminName ||
        ""
    );

  const [teamName, setTeamName] =
    useState(
      savedSession?.teamName ||
        ""
    );

  const [captainName, setCaptainName] =
    useState(
      savedSession?.captainName ||
        ""
    );

  // =====================================
  // SAVE SESSION
  // =====================================

  const saveSession = (
    session
  ) => {
    localStorage.setItem(
      "auctionSession",
      JSON.stringify(session)
    );
  };

  // =====================================
  // ADMIN LOGIN
  // =====================================

  const handleAdminLogin = (
    e
  ) => {
    e.preventDefault();

    const name =
      adminName.trim();

    if (!name) {
      alert(
        "Please enter admin name."
      );

      return;
    }

    // IMPORTANT:
    // Every NEW admin login
    // starts a completely fresh auction.

    socket.emit(
      "admin:start-session"
    );

    setAdminName(name);
    setTeamName("");
    setCaptainName("");
    setScreen("admin");

    saveSession({
      screen: "admin",
      adminName: name,
      teamName: "",
      captainName: "",
    });
  };

  // =====================================
  // PARTICIPANT LOGIN
  // =====================================

  const handleParticipantLogin = (
    e
  ) => {
    e.preventDefault();

    const team =
      teamName.trim();

    const captain =
      captainName.trim();

    if (!team || !captain) {
      alert(
        "Please enter Team Name and Captain Name."
      );

      return;
    }

    setAdminName("");
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

  // =====================================
  // LOGOUT
  // =====================================

  const logout = () => {
    if (
      screen === "admin"
    ) {
      const confirmed =
        window.confirm(
          "Logout as Admin?\n\nThis will clear the current auction session."
        );

      if (!confirmed) {
        return;
      }

      // Clear server data
      socket.emit(
        "admin:reset-all"
      );
    }

    // Clear browser session
    localStorage.removeItem(
      "auctionSession"
    );

    // Clear React state
    setAdminName("");
    setTeamName("");
    setCaptainName("");
    setScreen("login");
  };

  // =====================================
  // ADMIN
  // =====================================

  if (
    screen === "admin"
  ) {
    return (
      <AdminDashboard
        adminName={adminName}
        onLogout={logout}
      />
    );
  }

  // =====================================
  // PARTICIPANT
  // =====================================

  if (
    screen === "participant"
  ) {
    return (
      <ParticipantDashboard
        teamName={teamName}
        captainName={
          captainName
        }
        onLogout={logout}
      />
    );
  }

  // =====================================
  // LOGIN PAGE
  // =====================================

  return (
    <div className="app-page">
      <div className="login-card">

        <div className="login-brand">
          <span>
            FRIENDS FOOTBALL
          </span>

          <strong>
            AUCTION
          </strong>
        </div>

        <div className="login-heading">
          <p>
            LIVE FOOTBALL AUCTION
          </p>

          <h1>
            Welcome
          </h1>

          <span>
            Choose your access and
            join the auction.
          </span>
        </div>

        {/* ADMIN */}

        <form
          className="login-form"
          onSubmit={
            handleAdminLogin
          }
        >
          <div className="login-title">
            ADMIN ACCESS
          </div>

          <label>
            ADMIN NAME
          </label>

          <input
            type="text"
            placeholder="Enter admin name"
            value={adminName}
            onChange={(e) =>
              setAdminName(
                e.target.value
              )
            }
          />

          <button
            type="submit"
            className="admin-login-button"
          >
            ADMIN LOGIN

            <span>
              →
            </span>
          </button>
        </form>

        {/* DIVIDER */}

        <div className="login-divider">
          <span>
            OR
          </span>
        </div>

        {/* PARTICIPANT */}

        <form
          className="login-form"
          onSubmit={
            handleParticipantLogin
          }
        >
          <div className="login-title">
            PARTICIPANT ACCESS
          </div>

          <label>
            TEAM NAME
          </label>

          <input
            type="text"
            placeholder="Enter team name"
            value={teamName}
            onChange={(e) =>
              setTeamName(
                e.target.value
              )
            }
          />

          <label>
            CAPTAIN NAME
          </label>

          <input
            type="text"
            placeholder="Enter captain name"
            value={
              captainName
            }
            onChange={(e) =>
              setCaptainName(
                e.target.value
              )
            }
          />

          <button
            type="submit"
            className="participant-login-button"
          >
            JOIN AUCTION

            <span>
              →
            </span>
          </button>
        </form>

        <div className="login-footer">
          FRIENDS FOOTBALL AUCTION
        </div>

      </div>
    </div>
  );
}

export default App;