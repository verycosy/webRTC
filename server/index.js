const express = require("express"),
  http = require("http"),
  socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 5020;

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const ioHandler = socket => {
  console.log("Someone Connected");
};

io.on("connection", ioHandler);

server.listen(PORT, () =>
  console.log(`Signaling server running on localhost:${PORT}`)
);
