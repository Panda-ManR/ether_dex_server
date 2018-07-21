import mongoose, { Schema } from "mongoose";

const tradeSchema = new Schema(
  {
    txHash: {
      type: String,
      required: true
    },
    price: {
      type: String,
      required: true
    },
    side: {
      type: String,
      required: true
    },
    amount: {
      type: String,
      required: true
    },
    amountBase: {
      type: String,
      required: true
    },
    buyer: {
      type: String,
      required: true
    },
    seller: {
      type: String,
      required: true
    },
    tokenAddr: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

tradeSchema.methods = {
  view() {
    let view = {};

    let fields = [
      "_id",
      "txHash",
      "price",
      "side",
      "amount",
      "amountBase",
      "buyer",
      "seller",
      "tokenAddr"
    ];

    fields.forEach(field => {
      view[field] = this[field];
    });

    return view;
  }
};

const model = mongoose.model("Trade", tradeSchema);

export const schema = model.schema;
export default model;
