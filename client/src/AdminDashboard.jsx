 import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import players from "./players";
import "./AdminDashboard.css";

 const socket = io("https://freinds-football-auction-1.onrender.com", {
  transports: ["polling", "websocket"],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

const AUCTION_PHASES = [
  "Attackers",
  "Midfielders",
  "Defenders",
  "Goalkeepers",
];

const MAX_PLAYERS = 7;

function AdminDashboard({ adminName, onLogout }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [playerIndex, setPlayerIndex] = useState(0);

  const [currentBid, setCurrentBid] = useState(0);
  const [highestTeam, setHighestTeam] =
    useState("No Team");

  const [auctionStatus, setAuctionStatus] =
    useState("waiting");

  const [teams, setTeams] = useState({});
  const [participants, setParticipants] =
    useState([]);

  const [soldPlayers, setSoldPlayers] =
    useState([]);

  const [unsoldPlayers, setUnsoldPlayers] =
    useState([]);

  const currentPhase =
    AUCTION_PHASES[phaseIndex];

  const phasePlayers = useMemo(() => {
    return players.filter(
      (player) =>
        player.category === currentPhase
    );
  }, [currentPhase]);

  const currentPlayer =
    phasePlayers[playerIndex];

  const auctionLive =
    auctionStatus === "live";

  const startingBid =
    Number(currentPlayer?.startingBid) || 0;

  useEffect(() => {
    const handleConnect = () => {
      console.log(
        "ADMIN SOCKET CONNECTED:",
        socket.id
      );

      socket.emit("admin:join");
    };

    const handleDisconnect = () => {
      console.log("ADMIN SOCKET DISCONNECTED");
    };

    const handleAuctionState = (state) => {
      setCurrentBid(
        Number(state?.currentBid) || 0
      );

      setHighestTeam(
        state?.highestTeam || "No Team"
      );

      setAuctionStatus(
        state?.auctionStatus || "waiting"
      );

      const serverPlayer =
        state?.currentPlayer;

      if (!serverPlayer) return;

      const phase =
        AUCTION_PHASES.findIndex(
          (item) =>
            item === serverPlayer.category
        );

      if (phase !== -1) {
        setPhaseIndex(phase);

        const playersInPhase =
          players.filter(
            (player) =>
              player.category ===
              serverPlayer.category
          );

        const index =
          playersInPhase.findIndex(
            (player) =>
              player.id === serverPlayer.id
          );

        if (index !== -1) {
          setPlayerIndex(index);
        }
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    socket.on(
      "auction:state",
      handleAuctionState
    );

    socket.on(
      "teams:update",
      (data) => setTeams(data || {})
    );

    socket.on(
      "participants:update",
      (data) => setParticipants(data || [])
    );

    socket.on(
      "sold:update",
      (data) => setSoldPlayers(data || [])
    );

    socket.on(
      "unsold:update",
      (data) => setUnsoldPlayers(data || [])
    );

    socket.on(
      "participant:error",
      (data) => {
        alert(
          data?.message ||
            "Something went wrong."
        );
      }
    );

    if (socket.connected) {
      socket.emit("admin:join");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(
        "auction:state",
        handleAuctionState
      );
    };
  }, []);

  const startAuction = () => {
    if (!currentPlayer) {
      alert("No player available.");
      return;
    }

    socket.emit("auction:start", {
      player: currentPlayer,
    });
  };

  const selectTeam = (teamName) => {
    if (!auctionLive) {
      alert("Start the auction first.");
      return;
    }

    socket.emit("auction:select-team", {
      teamName,
    });
  };

  const sellPlayer = () => {
    if (
      auctionLive &&
      highestTeam !== "No Team"
    ) {
      socket.emit("auction:sold");
    }
  };

  const markUnsold = () => {
    if (auctionLive) {
      socket.emit("auction:unsold");
    }
  };

  const resetAuction = () => {
    socket.emit("auction:reset");
  };

  const moveToNextPlayer = () => {
    if (auctionLive) {
      alert("Finish the current auction first.");
      return;
    }

    if (
      playerIndex <
      phasePlayers.length - 1
    ) {
      setPlayerIndex(
        (prev) => prev + 1
      );
      resetAuction();
      return;
    }

    if (
      phaseIndex <
      AUCTION_PHASES.length - 1
    ) {
      setPhaseIndex(
        (prev) => prev + 1
      );

      setPlayerIndex(0);
      resetAuction();
      return;
    }

    alert("🎉 All auction phases completed!");
  };

  const moveToNextPhase = () => {
    if (auctionLive) {
      alert("Finish the current auction first.");
      return;
    }

    if (
      phaseIndex >=
      AUCTION_PHASES.length - 1
    ) {
      alert("All phases completed.");
      return;
    }

    setPhaseIndex(
      (prev) => prev + 1
    );

    setPlayerIndex(0);
    resetAuction();
  };

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString();

  const totalPlayers = players.length;
  const totalSold = soldPlayers.length;
  const totalUnsold = unsoldPlayers.length;

  const totalRemaining = Math.max(
    totalPlayers -
      totalSold -
      totalUnsold,
    0
  );

  const onlineTeams =
    participants.filter(
      (p) => p.online
    ).length;

  return (
    <div className="admin-dashboard">

      <header className="admin-header">
        <div className="admin-header-content">
          <p className="admin-eyebrow">
            FRIENDS FOOTBALL AUCTION
          </p>

          <h1>Admin Dashboard</h1>

          <p className="admin-subtitle">
            Welcome, {adminName || "Admin"}.
          </p>
        </div>

        <div className="admin-header-right">
          <div
            className={`admin-live-status ${
              auctionLive ? "live" : ""
            }`}
          >
            <span className="status-dot" />

            {auctionLive
              ? "LIVE AUCTION"
              : auctionStatus === "sold"
              ? "PLAYER SOLD"
              : auctionStatus === "unsold"
              ? "PLAYER UNSOLD"
              : "READY"}
          </div>

          <button
            className="admin-logout-btn"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="auction-phase-card">
        <div className="phase-heading">
          <div>
            <span className="section-label">
              CURRENT AUCTION PHASE
            </span>

            <h2>{currentPhase}</h2>
          </div>

          <div className="phase-counter">
            {phaseIndex + 1} /{" "}
            {AUCTION_PHASES.length}
          </div>
        </div>

        <div className="phase-progress">
          {AUCTION_PHASES.map(
            (phase, index) => (
              <div
                key={phase}
                className={`phase-item ${
                  index === phaseIndex
                    ? "active"
                    : index < phaseIndex
                    ? "completed"
                    : ""
                }`}
              >
                <span>{index + 1}</span>
                <p>{phase}</p>
              </div>
            )
          )}
        </div>
      </section>

      <section className="admin-stats">
        <div className="admin-stat-card">
          <span>TOTAL PLAYERS</span>
          <strong>{totalPlayers}</strong>
        </div>

        <div className="admin-stat-card">
          <span>PLAYERS SOLD</span>
          <strong>{totalSold}</strong>
        </div>

        <div className="admin-stat-card">
          <span>PLAYERS REMAINING</span>
          <strong>{totalRemaining}</strong>
        </div>

        <div className="admin-stat-card">
          <span>TEAMS ONLINE</span>
          <strong>
            {onlineTeams} /{" "}
            {Object.keys(teams).length}
          </strong>
        </div>
      </section>

      {currentPlayer && (
        <section className="auction-main-card">

          <div className="auction-player-header">
            <div>
              <span className="section-label">
                NOW AUCTIONING
              </span>

              <h2>{currentPlayer.name}</h2>

              <span className="player-position">
                {currentPlayer.position}
              </span>
            </div>

            <div className="player-number">
              {playerIndex + 1}
              <small>
                / {phasePlayers.length}
              </small>
            </div>
          </div>

          <div className="player-details">
            <div className="player-detail">
              <span>CATEGORY</span>
              <strong>
                {currentPlayer.category}
              </strong>
            </div>

            <div className="player-detail">
              <span>TIER</span>
              <strong>
                {currentPlayer.tier}
              </strong>
            </div>

            <div className="player-detail">
              <span>STARTING BID</span>
              <strong>
                $
                {formatMoney(startingBid)}
              </strong>
            </div>
          </div>

          <div className="bid-display">
            <span>CURRENT BID</span>

            <strong>
              $
              {formatMoney(
                currentBid || startingBid
              )}
            </strong>
          </div>

          <div className="highest-bidder">
            <span>
              CURRENT HIGHEST TEAM
            </span>

            <strong>
              {highestTeam}
            </strong>
          </div>

          {!auctionLive &&
            auctionStatus !== "sold" &&
            auctionStatus !== "unsold" && (
              <button
                className="start-auction-btn"
                onClick={startAuction}
              >
                🔨 START AUCTION
              </button>
            )}

          <div className="team-selection">
            <div className="team-selection-grid">
              {Object.entries(teams).map(
                ([name, team]) => (
                  <button
                    key={name}
                    className={`team-select-card ${
                      highestTeam === name
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectTeam(name)
                    }
                    disabled={
                      !auctionLive ||
                      team.players.length >=
                        MAX_PLAYERS
                    }
                  >
                    <strong>{name}</strong>

                    <span>
                      $
                      {formatMoney(
                        team.budget
                      )}
                    </span>

                    <span>
                      {team.players.length}/
                      {MAX_PLAYERS}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          <div className="auction-actions">
            <button
              className="auction-btn unsold"
              onClick={markUnsold}
              disabled={!auctionLive}
            >
              ❌ UNSOLD
            </button>

            <button
              className="auction-btn next"
              onClick={moveToNextPlayer}
              disabled={auctionLive}
            >
              ⏭ NEXT PLAYER
            </button>

            <button
              className="auction-btn sold"
              onClick={sellPlayer}
              disabled={
                !auctionLive ||
                highestTeam === "No Team"
              }
            >
              🏆 SOLD
            </button>
          </div>
        </section>
      )}

      <section className="phase-control">
        <button
          className="next-phase-btn"
          onClick={moveToNextPhase}
          disabled={
            auctionLive ||
            phaseIndex >=
              AUCTION_PHASES.length - 1
          }
        >
          Next Phase <span>→</span>
        </button>
      </section>

    </div>
  );
}

export default AdminDashboard;