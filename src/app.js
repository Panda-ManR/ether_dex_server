import fs from "fs";
import https from "https";
import { mongo } from "./config";
import mongoose from "./services/mongoose";
import etherDEX from "./services/etherDEX";
import Token from "./model/token";
import helmet from "helmet";
import cors from "cors";

const options = {
  cert: fs.readFileSync("./sslcert/fullchain.pem"),
  key: fs.readFileSync("./sslcert/privkey.pem")
};

const app = require("express")();
const httpServer = require("http").Server(app);
const httpsServer = https.createServer(options, app);

let io;
if (process.env.NODE_ENV === "production") {
  io = require("socket.io").listen(httpsServer);
} else {
  io = require("socket.io").listen(httpServer);
}

if (process.env.NODE_ENV === "production") {
  app.use(helmet());
  app.use(cors({ origin: "https://etherdex.trade" }));
} else {
  app.use(cors());
}

etherDEX.start(io);

app.get("/tokens", async (req, res) => res.send(await Token.find({}).exec()));

httpServer.listen(2095, () => {
  console.log("listening on *:2095");
});
if (process.env.NODE_ENV === "production") {
  httpsServer.listen(2096, () => {
    console.log("listening on *:2096");
  });
}

console.log(mongo.uri);

mongoose.connect(mongo.uri);
mongoose.Promise = Promise;

export default httpServer;
