import Order from "../../model/order";
import Trade from "../../model/trade";
import Fund from "../../model/fund";
import BigNumber from "bignumber.js";
import web3 from "../web3";
const EtherDEX = require("../../contracts/EtherDEX.json");

const etherDEX = {
  start: function(io) {
    console.log("EtherDEX WS API started");
    this.web3Listener(io);

    io.on("connection", socket => {
      socket.on("getMarket", async params => {
        let market = await this.getMarket(params.token, params.user);
        socket.emit("market", market);
      });

      socket.on("order", async order => {
        let newOrder = new Order({
          tokenGet: order.tokenGet,
          amountGet: order.amountGet,
          tokenGive: order.tokenGive,
          amountGive: order.amountGive,
          expires: order.expires,
          nonce: order.nonce,
          v: order.v,
          r: order.r,
          s: order.s,
          user: order.user,
          updated: new Date(),
          amount: order.amountGet,
          price: this.calculatePrice(order),
          availableVolume:
            order.type === "sell" ? order.amountGive : order.amountGet,
          amountFilled: "0",
          type: order.type
        });

        newOrder.save(async (err, order) => {
          io.emit("newOrder", order);
        });
      });

      socket.on("cancelOrder", async params => {
        this.pendingCancelOrder(params, params.hash, socket);
      });

      socket.on("orderPending", async params => {
        let orderToExecute = params.order;
        let hash = params.tradeHash;

        this.pendingTrade(orderToExecute, hash);
      });

      socket.on("disconnect", () => {});
    });
  },

  pendingCancelOrder(params, hash, socket) {
    web3.eth.getTransactionReceipt(hash, (err, receipt) => {
      if (receipt) {
        Order.findOneAndUpdate(
          { _id: params.orderID },
          { deleted: true },
          async (err, order) => {
            let market = await this.getMarket(params.token, params.user);
            socket.emit("market", market);
          }
        );
      } else {
        setTimeout(() => {
          this.pendingCancelOrder(params, hash, socket);
        }, 5000);
      }
    });
  },

  pendingTrade(orderToExecute, hash) {
    web3.eth.getTransactionReceipt(hash, (err, receipt) => {
      if (receipt && receipt.status) {
        Order.findOne(
          { _id: orderToExecute._id, deleted: false },
          async (err, order) => {
            let volumeLeft, volumeConsumed, amountFilled;
            if (order.type === "buy") {
              volumeConsumed = orderToExecute.amount;
            } else if (order.type === "sell") {
              volumeConsumed = new BigNumber(orderToExecute.amount)
                .dividedBy(new BigNumber(order.price))
                .toString();
            }

            volumeLeft = new BigNumber(order.availableVolume)
              .minus(new BigNumber(volumeConsumed))
              .toString();
            amountFilled = new BigNumber(order.amountFilled)
              .plus(new BigNumber(volumeConsumed))
              .toString();

            if (new BigNumber(volumeLeft).isLessThan(new BigNumber(0))) return;
            Order.findOneAndUpdate(
              {
                _id: order._id,
                deleted: false
              },
              {
                availableVolume: volumeLeft,
                amountFilled: amountFilled,
                deleted: volumeLeft <= 0
              },
              async (err, order) => {}
            );
          }
        );
      } else {
        setTimeout(() => {
          this.pendingTrade(orderToExecute, hash);
        }, 5000);
      }
    });
  },

  web3Listener: function(io) {
    const contractEtherDEX = new web3.eth.Contract(
      EtherDEX.abi,
      process.env.NODE_ENV === "production"
        ? "0x8AF4dfc5c55eF2D3BCE511E4C14d631253533540"
        : "0x03e1D29297d0f3d2D5e18a5CAbaD2307d9dA82a3"
    );

    contractEtherDEX.events.Trade(async (err, result) => {
      const trade = result.returnValues;

      let newTrade = new Trade({
        txHash: result.transactionHash,
        date: new Date(),
        price: this.calculatePrice(trade),
        side: this.isSell(trade) ? "sell" : "buy",
        amount: this.isSell(trade) ? trade.amountGive : trade.amountGet,
        amountBase: this.isSell(trade) ? trade.amountGet : trade.amountGive,
        buyer: this.isSell(trade) ? trade.give : trade.get,
        seller: this.isSell(trade) ? trade.get : trade.give,
        tokenAddr: this.isSell(trade) ? trade.tokenGive : trade.tokenGet
      });

      newTrade.save((err, trade) => {});

      let trades = await Trade.find({}).exec();
      io.emit("trades", trades);
    });

    contractEtherDEX.events.Deposit(async (err, result) => {
      const deposit = result.returnValues;

      let newFund = new Fund({
        txHash: result.transactionHash,
        date: new Date(),
        tokenAddr: deposit.token,
        kind: "Deposit",
        user: deposit.user,
        amount: deposit.amount,
        balance: deposit.balance
      });

      newFund.save((err, fund) => {});

      let funds = await Fund.find({}).exec();
      io.emit("funds", funds);
      io.emit("newFund", newFund);
    });

    contractEtherDEX.events.Withdraw(async (err, result) => {
      const withdraw = result.returnValues;

      let newFund = new Fund({
        txHash: result.transactionHash,
        date: new Date(),
        tokenAddr: withdraw.token,
        kind: "Withdraw",
        user: withdraw.user,
        amount: withdraw.amount,
        balance: withdraw.balance
      });

      newFund.save((err, fund) => {});

      let funds = await Fund.find({}).exec();
      io.emit("funds", funds);
      io.emit("newFund", newFund);
    });

    web3.eth.subscribe("newBlockHeaders", (error, data) => {
      if (!error) {
        let currentBlock = data.number;
        Order.update(
          { expires: { $lt: currentBlock } },
          { deleted: true },
          { multi: true },
          (err, raw) => {
            io.emit("requestMarketRefresh", currentBlock);
          }
        );
      }
    });
  },

  getMarket: async function(token, user) {
    return {
      returnTicker: {},
      orders: await this.getOrders(token),
      trades: await this.getTrades(token),
      myOrders: user ? await this.getOrders(token, user) : undefined,
      myTrades: user ? await this.getTrades(token, user) : undefined,
      myFunds: user ? await this.getFunds(token, user) : undefined
    };
  },

  getOrders: async function(token, user) {
    let sells = (await this.getSells(token, user)).sort((a, b) =>
      new BigNumber(b.price).minus(new BigNumber(a.price))
    );
    let buys = (await this.getBuys(token, user)).sort((a, b) =>
      new BigNumber(b.price).minus(new BigNumber(a.price))
    );
    return {
      sells: sells,
      buys: buys
    };
  },

  getSells: async function(token, user) {
    if (user) {
      return Order.find({
        type: "sell",
        tokenGive: token,
        user: user,
        deleted: false
      }).exec();
    }
    return Order.find({
      type: "sell",
      tokenGive: token,
      deleted: false
    }).exec();
  },

  getBuys: async function(token, user) {
    if (user) {
      return Order.find({
        type: "buy",
        tokenGet: token,
        user: user,
        deleted: false
      });
    }
    return Order.find({ type: "buy", tokenGet: token, deleted: false });
  },

  getTrades: async function(token, user) {
    if (user) {
      return Trade.find({
        tokenAddr: token,
        $or: [{ buyer: user }, { seller: user }]
      })
        .sort({ createdAt: "descending" })
        .limit(20)
        .exec();
    } else {
      return Trade.find({ tokenAddr: token })
        .sort({ createdAt: "descending" })
        .limit(20)
        .exec();
    }
  },

  getFunds: async function(token, user) {
    return Fund.find({
      user: user
    }).exec();
  },

  isSell: function(order) {
    if (order.tokenGet === "0x0000000000000000000000000000000000000000")
      return true;
    if (order.tokenGive === "0x0000000000000000000000000000000000000000")
      return false;
  },

  calculatePrice: function(order) {
    return this.isSell(order)
      ? new BigNumber(order.amountGet)
          .dividedBy(new BigNumber(order.amountGive))
          .toString()
      : new BigNumber(order.amountGive)
          .dividedBy(new BigNumber(order.amountGet))
          .toString();
  },

  toEth(wei, decimals) {
    return new BigNumber(String(wei)).div(new BigNumber(10 ** decimals));
  }
};

export default etherDEX;
