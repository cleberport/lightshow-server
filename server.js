import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const PORT = process.env.PORT || 10000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const CONTROLLER_KEY = process.env.CONTROLLER_KEY || "play123";

const app = express();
app.use(cors({
  origin: ALLOWED_ORIGIN === "*" ? true : [ALLOWED_ORIGIN],
  credentials: true
}));

app.get("/", (_req, res) => {
  res.send("✅ LightShow WebSocket server is running.");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN === "*" ? true : [ALLOWED_ORIGIN],
    methods: ["GET", "POST"]
  }
});

let currentState = {
  color: "#ffffff",
  strobe: false,
  speed: 120,
  logoUrl: ""
};

io.on("connection", (socket) => {
  console.log("Nova conexão:", socket.id);

  socket.on("join", (role) => {
    console.log("Entrou como:", role);
    if (role === "audience") {
      socket.join("audience");
      socket.emit("state", currentState);
    }
    if (role === "controller") {
      socket.join("controller");
    }
  });

  socket.on("setState", (payload) => {
    const { key, state } = payload || {};
    if (CONTROLLER_KEY && key !== CONTROLLER_KEY) {
      console.log("Chave incorreta");
      return;
    }
    if (!state) return;
    currentState = {
      color: state.color || currentState.color,
      strobe: !!state.strobe,
      speed: Math.max(20, Math.min(2000, parseInt(state.speed || currentState.speed, 10))),
      logoUrl: state.logoUrl || ""
    };
    io.to("audience").emit("state", currentState);
  });

  socket.on("command", (payload) => {
    const { key, type } = payload || {};
    if (CONTROLLER_KEY && key !== CONTROLLER_KEY) return;
    if (type === "blackout") {
      currentState.color = "#000000";
      currentState.strobe = false;
      io.to("audience").emit("state", currentState);
    }
    if (type === "whiteout") {
      currentState.color = "#ffffff";
      currentState.strobe = false;
      io.to("audience").emit("state", currentState);
    }
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor LightShow ativo na porta ${PORT}`);
});
