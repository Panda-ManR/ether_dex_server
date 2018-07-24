import Web3 from "web3";

export default new Web3(
  new Web3.providers.WebsocketProvider(
    process.env.NODE_ENV === "production"
      ? "wss://mainnet.infura.io/ws"
      : "wss://ropsten.infura.io/ws"
  )
);
