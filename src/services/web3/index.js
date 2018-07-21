import Web3 from "web3";

export default new Web3(
  new Web3.providers.WebsocketProvider(
    process.env.NODE_ENV === "production"
      ? "ws://localhost:8546"
      : "wss://ropsten.infura.io/ws"
  )
);
