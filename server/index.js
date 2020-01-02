const express = require("express"),
  // https = require("https"),
  http = require("http"),
  socketIO = require("socket.io"),
  // fs = require("fs");

const PORT = 5020;
// const option = {
//   key: fs.readFileSync("./keys/server.key"),
//   cert: fs.readFileSync("./keys/server.crt")
// };

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const ioHandler = socket => {
  console.log("Someone Connected");
  socket.on("disconnect", () => console.log("Someone Disconnected"));

  socket.on("icecandidate", icecandidate => {
    console.log("ICE Candidate Exchange");
    socket.broadcast.emit("icecandidate", icecandidate);
  });

  socket.on("offer", sdpOffer => {
    console.log("Someone Offered");
    console.log(sdpOffer);
    socket.broadcast.emit("offer", sdpOffer);
  });

  socket.on("answer", sdpAnswer => {
    console.log("Someone Answered");
    console.log(sdpAnswer);
    socket.broadcast.emit("answer", sdpAnswer);
  });
};

io.on("connection", ioHandler);

server.listen(PORT, () =>
  console.log(`Signaling server running on localhost:${PORT}`)
);
