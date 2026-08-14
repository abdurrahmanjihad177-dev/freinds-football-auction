 import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import players from "./players";
import "./AdminDashboard.css";

const socket = io("http://localhost:5000");

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
  const [highestTeam, setHighestTeam] = useState("No Team");
  const [auctionStatus, setAuctionStatus] = useState("waiting");

  const [teams, setTeams] = useState({});
  const [participants, setParticipants] = useState([]);

  const [soldPlayers, setSoldPlayers] = useState([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);

  const currentPhase = AUCTION_PHASES[phaseIndex];

  const phasePlayers = useMemo(() => {
    return players.filter(
      (player) => player.category === currentPhase
    );
  }, [currentPhase]);

  const currentPlayer = phasePlayers[playerIndex];

  const startingBid =
    Number(currentPlayer?.startingBid) || 0;

  const auctionLive = auctionStatus === "live";

  // =====================================
  // SOCKET
  // =====================================

  useEffect(() => {
    socket.emit("admin:join");

    const handleAuctionState = (state) => {
      setCurrentBid(Number(state?.currentBid) || 0);

      setHighestTeam(
        state?.highestTeam || "No Team"
      );

      setAuctionStatus(
        state?.auctionStatus || "waiting"
      );

      const serverPlayer = state?.currentPlayer;

      if (!serverPlayer) return;

      const serverPhaseIndex =
        AUCTION_PHASES.findIndex(
          (phase) =>
            phase === serverPlayer.category
        );

      if (serverPhaseIndex !== -1) {
        setPhaseIndex(serverPhaseIndex);

        const playersInPhase = players.filter(
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

    const handleTeamsUpdate = (data) => {
      setTeams(data || {});
    };

    const handleParticipantsUpdate = (data) => {
      setParticipants(data || []);
    };

    const handleSoldUpdate = (data) => {
      setSoldPlayers(data || []);
    };

    const handleUnsoldUpdate = (data) => {
      setUnsoldPlayers(data || []);
    };

    const handleError = (data) => {
      alert(
        data?.message ||
        "Something went wrong."
      );
    };

    socket.on(
      "auction:state",
      handleAuctionState
    );

    socket.on(
      "teams:update",
      handleTeamsUpdate
    );

    socket.on(
      "participants:update",
      handleParticipantsUpdate
    );

    socket.on(
      "sold:update",
      handleSoldUpdate
    );

    socket.on(
      "unsold:update",
      handleUnsoldUpdate
    );

    socket.on(
      "participant:error",
      handleError
    );

    return () => {
      socket.off(
        "auction:state",
        handleAuctionState
      );

      socket.off(
        "teams:update",
        handleTeamsUpdate
      );

      socket.off(
        "participants:update",
        handleParticipantsUpdate
      );

      socket.off(
        "sold:update",
        handleSoldUpdate
      );

      socket.off(
        "unsold:update",
        handleUnsoldUpdate
      );

      socket.off(
        "participant:error",
        handleError
      );
    };
  }, []);

  // =====================================
  // START AUCTION
  // =====================================

  const startAuction = () => {
    if (!currentPlayer) {
      alert("No player available.");
      return;
    }

    socket.emit("auction:start", {
      player: currentPlayer,
    });
  };

  // =====================================
  // SELECT TEAM
  // =====================================

  const selectTeam = (teamName) => {
    if (!auctionLive) {
      alert("Start the auction first.");
      return;
    }

    const team = teams[teamName];

    if (!team) {
      return;
    }

    if (team.players.length >= MAX_PLAYERS) {
      alert(
        `${teamName} already has ${MAX_PLAYERS} players.`
      );
      return;
    }

    if (currentBid > team.budget) {
      alert(
        `${teamName} does not have enough budget.`
      );
      return;
    }

    socket.emit(
      "auction:select-team",
      { teamName }
    );
  };

  // =====================================
  // SOLD
  // =====================================

  const sellPlayer = () => {
    if (!auctionLive) return;

    if (
      !highestTeam ||
      highestTeam === "No Team"
    ) {
      alert("Please select a team first.");
      return;
    }

    socket.emit("auction:sold");
  };

  // =====================================
  // UNSOLD
  // =====================================

  const markUnsold = () => {
    if (!auctionLive) return;

    socket.emit("auction:unsold");
  };

  // =====================================
  // RESET
  // =====================================

  const resetAuction = () => {
    socket.emit("auction:reset");
  };

  // =====================================
  // NEXT PLAYER
  // =====================================

  const moveToNextPlayer = () => {
    if (auctionLive) {
      alert(
        "Finish the current auction first."
      );
      return;
    }

    if (
      playerIndex <
      phasePlayers.length - 1
    ) {
      setPlayerIndex(
        (previous) => previous + 1
      );

      resetAuction();
      return;
    }

    if (
      phaseIndex <
      AUCTION_PHASES.length - 1
    ) {
      setPhaseIndex(
        (previous) => previous + 1
      );

      setPlayerIndex(0);

      resetAuction();
      return;
    }

    alert(
      "🎉 All auction phases completed!"
    );
  };

  // =====================================
  // NEXT PHASE
  // =====================================

  const moveToNextPhase = () => {
    if (auctionLive) {
      alert(
        "Finish the current auction first."
      );
      return;
    }

    if (
      phaseIndex >=
      AUCTION_PHASES.length - 1
    ) {
      alert(
        "All auction phases are completed."
      );
      return;
    }

    setPhaseIndex(
      (previous) => previous + 1
    );

    setPlayerIndex(0);

    resetAuction();
  };

  // =====================================
  // STATS
  // =====================================

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
      (participant) =>
        participant.online
    ).length;

  const statusLabel =
    auctionStatus === "live"
      ? "LIVE AUCTION"
      : auctionStatus === "sold"
      ? "PLAYER SOLD"
      : auctionStatus === "unsold"
      ? "PLAYER UNSOLD"
      : "READY";

  const formatMoney = (value) => {
    return Number(
      value || 0
    ).toLocaleString();
  };

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="admin-dashboard">

      {/* HEADER */}

      <header className="admin-header">

        <div className="admin-header-content">

          <p className="admin-eyebrow">
            FRIENDS FOOTBALL AUCTION
          </p>

          <h1>
            Admin Dashboard
          </h1>

          <p className="admin-subtitle">
            Welcome, {adminName || "Admin"}.
            Manage players, teams and live
            auction activity.
          </p>

        </div>

        <div className="admin-header-right">

          <div
            className={`admin-live-status ${
              auctionLive ? "live" : ""
            }`}
          >
            <span className="status-dot" />
            {statusLabel}
          </div>

          <button
            className="admin-logout-btn"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* PHASE */}

      <section className="auction-phase-card">

        <div className="phase-heading">

          <div>
            <span className="section-label">
              CURRENT AUCTION PHASE
            </span>

            <h2>
              {currentPhase}
            </h2>
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

                <span>
                  {index + 1}
                </span>

                <p>
                  {phase}
                </p>

              </div>
            )
          )}

        </div>

      </section>

      {/* STATS */}

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

      {/* CURRENT PLAYER */}

      {currentPlayer ? (

        <section className="auction-main-card">

          <div className="auction-player-header">

            <div>

              <span className="section-label">
                NOW AUCTIONING
              </span>

              <h2>
                {currentPlayer.name}
              </h2>

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

          {/* PLAYER DETAILS */}

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

          {/* BID */}

          <div className="bid-display">

            <span>CURRENT BID</span>

            <strong>
              $
              {formatMoney(
                currentBid ||
                startingBid
              )}
            </strong>

          </div>

          {/* HIGHEST TEAM */}

          <div className="highest-bidder">

            <span>
              CURRENT HIGHEST TEAM
            </span>

            <strong>
              {highestTeam !== "No Team"
                ? highestTeam
                : "No Team Selected"}
            </strong>

          </div>

          {/* START */}

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

          {/* TEAM SELECTION */}

          <div className="team-selection">

            <div className="team-selection-header">

              <div>
                <span className="section-label">
                  SELECT TEAM
                </span>

                <p>
                  Choose the current
                  highest bidder.
                </p>
              </div>

            </div>

            <div className="team-selection-grid">

              {Object.keys(teams).length === 0 ? (

                <div className="no-teams">
                  No teams have joined yet.
                </div>

              ) : (

                Object.entries(teams).map(
                  ([teamName, team]) => {

                    const isSelected =
                      highestTeam === teamName;

                    const isFull =
                      team.players.length >=
                      MAX_PLAYERS;

                    const insufficientBudget =
                      currentBid >
                      team.budget;

                    return (
                      <button
                        key={teamName}
                        className={`team-select-card ${
                          isSelected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          selectTeam(teamName)
                        }
                        disabled={
                          !auctionLive ||
                          isFull ||
                          insufficientBudget
                        }
                      >

                        <div className="team-card-top">

                          <strong>
                            {teamName}
                          </strong>

                          {isSelected && (
                            <span className="selected-badge">
                              HIGHEST
                            </span>
                          )}

                        </div>

                        <div className="team-card-bottom">

                          <span>
                            $
                            {formatMoney(
                              team.budget
                            )}
                          </span>

                          <span>
                            {team.players.length}
                            /{MAX_PLAYERS}
                          </span>

                        </div>

                      </button>
                    );
                  }
                )

              )}

            </div>

          </div>

          {/* ACTIONS */}

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

      ) : (

        <section className="auction-main-card auction-complete">

          <div className="complete-icon">
            🎉
          </div>

          <h2>
            Auction Completed
          </h2>

          <p>
            All players have been processed.
          </p>

        </section>

      )}

      {/* NEXT PHASE */}

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
          Next Phase
          <span>→</span>
        </button>

      </section>

      {/* TEAMS */}

      <section className="admin-list-section">

        <div className="list-section-header">

          <div>
            <span className="section-label">
              TOURNAMENT
            </span>

            <h2>
              Teams
            </h2>
          </div>

          <span className="list-count">
            {Object.keys(teams).length}
          </span>

        </div>

        <div className="teams-grid">

          {Object.keys(teams).length === 0 ? (

            <div className="empty-state">

              <span>👥</span>

              <h3>
                No Teams Yet
              </h3>

              <p>
                Waiting for participants
                to join.
              </p>

            </div>

          ) : (

            Object.entries(teams).map(
              ([teamName, team]) => (

                <div
                  className={`admin-team-card ${
                    highestTeam === teamName
                      ? "auction-selected-team"
                      : ""
                  }`}
                  key={teamName}
                >

                  <div className="admin-team-card-header">

                    <div>

                      <h3>
                        {teamName}
                      </h3>

                      <p>
                        Captain:{" "}
                        {team.captainName ||
                          "Not available"}
                      </p>

                    </div>

                    {highestTeam === teamName && (
                      <span className="winner-tag">
                        HIGHEST
                      </span>
                    )}

                  </div>

                  <div className="admin-team-stats">

                    <div>
                      <span>BUDGET</span>

                      <strong>
                        $
                        {formatMoney(
                          team.budget
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>PLAYERS</span>

                      <strong>
                        {team.players.length}
                        /{MAX_PLAYERS}
                      </strong>
                    </div>

                  </div>

                  {team.players.length > 0 && (

                    <div className="team-player-list">

                      {team.players.map(
                        (player, index) => (

                          <div
                            className="team-player-row"
                            key={`${player.id}-${index}`}
                          >

                            <span>
                              {player.name}
                            </span>

                            <strong>
                              $
                              {formatMoney(
                                player.soldPrice
                              )}
                            </strong>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              )
            )

          )}

        </div>

      </section>

      {/* SOLD */}

      <section className="admin-list-section">

        <div className="list-section-header">

          <div>
            <span className="section-label">
              AUCTION RESULTS
            </span>

            <h2>
              🏆 Sold Players
            </h2>
          </div>

          <span className="list-count">
            {totalSold}
          </span>

        </div>

        {soldPlayers.length === 0 ? (

          <div className="empty-state compact">
            <p>No players sold yet.</p>
          </div>

        ) : (

          <div className="result-grid">

            {soldPlayers.map(
              (player, index) => (

                <div
                  className="result-card sold-card"
                  key={`${player.id}-${index}`}
                >

                  <div>
                    <h3>
                      {player.name}
                    </h3>

                    <span>
                      {player.position}
                    </span>
                  </div>

                  <div className="result-team">

                    <small>TEAM</small>

                    <strong>
                      {player.team}
                    </strong>

                  </div>

                  <div className="result-price">
                    $
                    {formatMoney(
                      player.soldPrice
                    )}
                  </div>

                </div>

              )
            )}

          </div>

        )}

      </section>

      {/* UNSOLD */}

      <section className="admin-list-section">

        <div className="list-section-header">

          <div>
            <span className="section-label">
              AUCTION RESULTS
            </span>

            <h2>
              ❌ Unsold Players
            </h2>
          </div>

          <span className="list-count">
            {totalUnsold}
          </span>

        </div>

        {unsoldPlayers.length === 0 ? (

          <div className="empty-state compact">
            <p>No unsold players.</p>
          </div>

        ) : (

          <div className="result-grid">

            {unsoldPlayers.map(
              (player, index) => (

                <div
                  className="result-card unsold-card"
                  key={`${player.id}-${index}`}
                >

                  <div>
                    <h3>
                      {player.name}
                    </h3>

                    <span>
                      {player.position}
                    </span>
                  </div>

                  <div className="result-team">

                    <small>CATEGORY</small>

                    <strong>
                      {player.category}
                    </strong>

                  </div>

                  <div className="unsold-label">
                    UNSOLD
                  </div>

                </div>

              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}

export default AdminDashboard;