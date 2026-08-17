  const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MAX_PLAYERS = 7;
const STARTING_BUDGET = 10000;
const BID_INCREMENT = 100;

const teams = {};
const participants = new Map();

const soldPlayers = [];
const unsoldPlayers = [];

let auctionState = {
  currentPlayer: null,
  currentBid: 0,
  highestTeam: "No Team",
  auctionStatus: "waiting",
};

function emitAll() {
  io.emit("teams:update", teams);

  io.emit(
    "participants:update",
    Array.from(participants.values()).map((p) => ({
      teamName: p.teamName,
      captainName: p.captainName,
      online: p.online,
    }))
  );

  io.emit("auction:state", auctionState);
  io.emit("sold:update", soldPlayers);
  io.emit("unsold:update", unsoldPlayers);
}

app.get("/", (req, res) => {
  res.json({
    message: "Friends Football Auction Server Running",
    status: "online",
  });
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ADMIN JOIN
  socket.on("admin:join", () => {
    socket.data.isAdmin = true;

    socket.join("admin");

    emitAll();

    console.log("Admin connected:", socket.id);
  });

  // PARTICIPANT JOIN
  socket.on("participant:join", (data) => {
    const teamName = String(data?.teamName || "").trim();
    const captainName = String(data?.captainName || "").trim();

    if (!teamName || !captainName) {
      socket.emit("participant:error", {
        message: "Team name and captain name are required.",
      });
      return;
    }

    if (!teams[teamName]) {
      teams[teamName] = {
        teamName,
        captainName,
        budget: STARTING_BUDGET,
        players: [],
      };
    } else {
      teams[teamName].captainName = captainName;
    }

    participants.set(socket.id, {
      teamName,
      captainName,
      online: true,
    });

    socket.data.teamName = teamName;

    emitAll();

    console.log(
      `Participant connected: ${captainName} → ${teamName}`
    );
  });

  // START AUCTION
  socket.on("auction:start", (data) => {
    if (!data?.player) {
      console.log("No player received.");
      return;
    }

    const player = data.player;

    auctionState = {
      currentPlayer: player,
      currentBid: Number(player.startingBid) || 0,
      highestTeam: "No Team",
      auctionStatus: "live",
    };

    emitAll();

    console.log(`Auction started: ${player.name}`);
  });

  // BID
  socket.on("auction:bid", (data) => {
    if (auctionState.auctionStatus !== "live") {
      return;
    }

    const teamName = socket.data.teamName;

    if (!teamName || !teams[teamName]) {
      socket.emit("participant:error", {
        message: "You are not connected to a team.",
      });
      return;
    }

    const team = teams[teamName];

    if (team.players.length >= MAX_PLAYERS) {
      socket.emit("participant:error", {
        message: "Your team already has maximum players.",
      });
      return;
    }

    const amount = Number(data?.amount);

    if (!Number.isFinite(amount)) {
      return;
    }

    if (amount !== auctionState.currentBid + BID_INCREMENT) {
      return;
    }

    if (amount > team.budget) {
      socket.emit("participant:error", {
        message: "Your team does not have enough budget.",
      });
      return;
    }

    auctionState.currentBid = amount;
    auctionState.highestTeam = teamName;

    emitAll();

    console.log(`${teamName} bid ${amount}`);
  });

  // ADMIN SELECT TEAM
  socket.on("auction:select-team", (data) => {
    if (auctionState.auctionStatus !== "live") {
      return;
    }

    const teamName = String(data?.teamName || "").trim();
    const team = teams[teamName];

    if (!team) {
      return;
    }

    if (team.players.length >= MAX_PLAYERS) {
      return;
    }

    if (auctionState.currentBid > team.budget) {
      return;
    }

    auctionState.highestTeam = teamName;

    emitAll();
  });

  // SOLD
  socket.on("auction:sold", () => {
    if (auctionState.auctionStatus !== "live") {
      return;
    }

    const player = auctionState.currentPlayer;
    const teamName = auctionState.highestTeam;

    if (!player || teamName === "No Team") {
      return;
    }

    const team = teams[teamName];

    if (!team) {
      return;
    }

    const price = auctionState.currentBid;

    if (team.players.length >= MAX_PLAYERS) {
      return;
    }

    if (price > team.budget) {
      return;
    }

    const purchasedPlayer = {
      ...player,
      team: teamName,
      soldPrice: price,
    };

    team.players.push(purchasedPlayer);
    team.budget -= price;

    soldPlayers.push(purchasedPlayer);

    auctionState.auctionStatus = "sold";

    emitAll();

    console.log(
      `${player.name} sold to ${teamName} for ${price}`
    );
  });

  // UNSOLD
  socket.on("auction:unsold", () => {
    if (auctionState.auctionStatus !== "live") {
      return;
    }

    const player = auctionState.currentPlayer;

    if (!player) {
      return;
    }

    unsoldPlayers.push({
      ...player,
      status: "unsold",
    });

    auctionState.auctionStatus = "unsold";

    emitAll();

    console.log(`${player.name} marked unsold`);
  });

  // RESET
  socket.on("auction:reset", () => {
    auctionState = {
      currentPlayer: null,
      currentBid: 0,
      highestTeam: "No Team",
      auctionStatus: "waiting",
    };

    emitAll();

    console.log("Auction reset");
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const participant = participants.get(socket.id);

    if (participant) {
      participant.online = false;
      participants.set(socket.id, participant);

      emitAll();

      console.log(
        `Participant disconnected: ${participant.teamName}`
      );
    } else {
      console.log("Socket disconnected:", socket.id);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Auction server running on port ${PORT}`);
});