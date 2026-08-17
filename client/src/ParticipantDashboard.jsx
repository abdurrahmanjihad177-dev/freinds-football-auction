   import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import players from "./players";
import "./ParticipantDashboard.css";

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

function ParticipantDashboard({
  teamName,
  captainName,
  onLogout,
}) {
  const [currentBid, setCurrentBid] = useState(0);
  const [highestTeam, setHighestTeam] =
    useState("No Team");

  const [auctionStatus, setAuctionStatus] =
    useState("waiting");

  const [teams, setTeams] = useState({});
  const [soldPlayers, setSoldPlayers] =
    useState([]);

  const [unsoldPlayers, setUnsoldPlayers] =
    useState([]);

  const [phaseIndex, setPhaseIndex] =
    useState(0);

  const [playerIndex, setPlayerIndex] =
    useState(0);

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

  const startingBid =
    Number(currentPlayer?.startingBid) || 0;

  const auctionLive =
    auctionStatus === "live";

  const myTeam = teams[teamName];

  // JOIN
  useEffect(() => {
    const join = () => {
      console.log(
        "PARTICIPANT SOCKET CONNECTED:",
        socket.id
      );

      if (teamName && captainName) {
        socket.emit(
          "participant:join",
          {
            teamName,
            captainName,
          }
        );
      }
    };

    socket.on("connect", join);

    if (socket.connected) {
      join();
    }

    return () => {
      socket.off("connect", join);
    };
  }, [teamName, captainName]);

  // LISTENERS
  useEffect(() => {
    const handleAuctionState = (state) => {
      setCurrentBid(
        Number(state?.currentBid) || 0
      );

      setHighestTeam(
        state?.highestTeam ||
          "No Team"
      );

      setAuctionStatus(
        state?.auctionStatus ||
          "waiting"
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
              player.id ===
              serverPlayer.id
          );

        if (index !== -1) {
          setPlayerIndex(index);
        }
      }
    };

    socket.on(
      "teams:update",
      (data) => {
        setTeams(data || {});
      }
    );

    socket.on(
      "auction:state",
      handleAuctionState
    );

    socket.on(
      "sold:update",
      (data) => {
        setSoldPlayers(data || []);
      }
    );

    socket.on(
      "unsold:update",
      (data) => {
        setUnsoldPlayers(data || []);
      }
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

    return () => {
      socket.off(
        "auction:state",
        handleAuctionState
      );
    };
  }, []);

  const placeBid = () => {
    if (!myTeam) {
      alert("Your team is not connected.");
      return;
    }

    if (!auctionLive) {
      alert("Auction is not live.");
      return;
    }

    if (
      myTeam.players.length >=
      MAX_PLAYERS
    ) {
      alert("Your team is full.");
      return;
    }

    const nextBid =
      currentBid + 100;

    if (nextBid > myTeam.budget) {
      alert("You don't have enough budget.");
      return;
    }

    socket.emit("auction:bid", {
      amount: nextBid,
    });
  };

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString();

  return (
    <div className="participant-dashboard">

      <header className="participant-header">
        <div>
          <p className="participant-eyebrow">
            FRIENDS FOOTBALL AUCTION
          </p>

          <h1>{teamName}</h1>

          <p>
            Captain: {captainName}
          </p>
        </div>

        <div className="participant-header-right">
          <div
            className={`participant-live-status ${
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
              : "WAITING"}
          </div>

          <button
            className="participant-logout-btn"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="participant-summary">

        <div className="summary-card">
          <span>AVAILABLE BUDGET</span>

          <strong>
            $
            {formatMoney(
              myTeam?.budget
            )}
          </strong>
        </div>

        <div className="summary-card">
          <span>PLAYERS</span>

          <strong>
            {myTeam?.players?.length || 0}/
            {MAX_PLAYERS}
          </strong>
        </div>

        <div className="summary-card">
          <span>PLAYERS SOLD</span>

          <strong>
            {soldPlayers.length}
          </strong>
        </div>

      </section>

      <section className="participant-auction-card">

        {currentPlayer ? (
          <>
            <div className="participant-player-top">
              <div>
                <span>
                  NOW AUCTIONING
                </span>

                <h2>
                  {currentPlayer.name}
                </h2>

                <p>
                  {currentPlayer.position}
                </p>
              </div>

              <div className="participant-player-number">
                {playerIndex + 1}

                <small>
                  / {phasePlayers.length}
                </small>
              </div>
            </div>

            <div className="participant-player-info">

              <div>
                <span>CATEGORY</span>
                <strong>
                  {currentPlayer.category}
                </strong>
              </div>

              <div>
                <span>TIER</span>
                <strong>
                  {currentPlayer.tier}
                </strong>
              </div>

              <div>
                <span>STARTING BID</span>

                <strong>
                  $
                  {formatMoney(
                    startingBid
                  )}
                </strong>
              </div>

            </div>

            <div className="participant-bid-box">
              <span>CURRENT BID</span>

              <strong>
                $
                {formatMoney(
                  currentBid ||
                    startingBid
                )}
              </strong>
            </div>

            <div className="participant-highest">
              <span>
                HIGHEST BIDDER
              </span>

              <strong>
                {highestTeam === teamName
                  ? "YOUR TEAM"
                  : highestTeam}
              </strong>
            </div>

            <button
              className="place-bid-btn"
              onClick={placeBid}
              disabled={
                !auctionLive ||
                !myTeam ||
                myTeam.players.length >=
                  MAX_PLAYERS ||
                currentBid + 100 >
                  myTeam.budget
              }
            >
              🔨 PLACE BID
              <span>+$100</span>
            </button>

            {!auctionLive && (
              <p className="waiting-message">
                Waiting for admin to start
                the auction...
              </p>
            )}
          </>
        ) : (
          <div className="participant-waiting">
            <div>⚽</div>

            <h2>
              Waiting for Player
            </h2>

            <p>
              The admin will start the
              next auction soon.
            </p>
          </div>
        )}

      </section>

      <section className="participant-section">

        <div className="participant-section-header">
          <div>
            <span>YOUR TEAM</span>
            <h2>My Squad</h2>
          </div>

          <strong>
            {myTeam?.players?.length || 0}/
            {MAX_PLAYERS}
          </strong>
        </div>

        {myTeam?.players?.length ? (
          <div className="my-squad-grid">

            {myTeam.players.map(
              (player, index) => (
                <div
                  className="squad-player-card"
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
        ) : (
          <div className="participant-empty">
            No players purchased yet.
          </div>
        )}

      </section>

      <section className="participant-section">

        <div className="participant-section-header">
          <div>
            <span>TOURNAMENT</span>
            <h2>All Teams</h2>
          </div>

          <strong>
            {Object.keys(teams).length}
          </strong>
        </div>

        <div className="other-teams-grid">

          {Object.entries(teams).map(
            ([name, team]) => (
              <div
                key={name}
                className={`other-team-card ${
                  name === teamName
                    ? "my-team"
                    : ""
                } ${
                  name === highestTeam
                    ? "highest-team"
                    : ""
                }`}
              >
                <div className="other-team-header">

                  <div>
                    <h3>{name}</h3>

                    <p>
                      {team.captainName}
                    </p>
                  </div>

                  {name === teamName && (
                    <span>YOU</span>
                  )}

                </div>

                <div className="other-team-stats">

                  <div>
                    <small>BUDGET</small>

                    <strong>
                      $
                      {formatMoney(
                        team.budget
                      )}
                    </strong>
                  </div>

                  <div>
                    <small>PLAYERS</small>

                    <strong>
                      {team.players.length}/
                      {MAX_PLAYERS}
                    </strong>
                  </div>

                </div>
              </div>
            )
          )}

        </div>

      </section>

      <section className="participant-section">

        <div className="participant-section-header">
          <div>
            <span>AUCTION RESULTS</span>
            <h2>Sold Players</h2>
          </div>

          <strong>
            {soldPlayers.length}
          </strong>
        </div>

        {soldPlayers.length === 0 ? (
          <div className="participant-empty">
            No players sold yet.
          </div>
        ) : (
          <div className="participant-results-grid">

            {soldPlayers.map(
              (player, index) => (
                <div
                  className={`participant-result-card ${
                    player.team === teamName
                      ? "my-purchase"
                      : ""
                  }`}
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

                  <div>
                    <small>TEAM</small>

                    <strong>
                      {player.team}
                    </strong>
                  </div>

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

      </section>

      <section className="participant-section">

        <div className="participant-section-header">
          <div>
            <span>AUCTION RESULTS</span>
            <h2>Unsold Players</h2>
          </div>

          <strong>
            {unsoldPlayers.length}
          </strong>
        </div>

        {unsoldPlayers.length === 0 ? (
          <div className="participant-empty">
            No unsold players yet.
          </div>
        ) : (
          <div className="participant-results-grid">

            {unsoldPlayers.map(
              (player, index) => (
                <div
                  className="participant-result-card"
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

                  <div>
                    <small>CATEGORY</small>

                    <strong>
                      {player.category}
                    </strong>
                  </div>

                  <strong className="unsold-text">
                    UNSOLD
                  </strong>
                </div>
              )
            )}

          </div>
        )}

      </section>

    </div>
  );
}

export default ParticipantDashboard;