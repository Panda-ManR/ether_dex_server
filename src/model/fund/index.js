import mongoose, { Schema } from "mongoose";

const fundSchema = new Schema(
  {
    txHash: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    tokenAddr: {
      type: String,
      required: true
    },
    kind: {
      type: String,
      required: true
    },
    user: {
      type: String,
      required: true
    },
    amount: {
      type: String,
      required: true
    },
    balance: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

fundSchema.methods = {
  view() {
    let view = {};

    let fields = [
      "_id",
      "txHash",
      "date",
      "tokenAddr",
      "kind",
      "user",
      "amount",
      "balance"
    ];

    fields.forEach(field => {
      view[field] = this[field];
    });

    return view;
  }
};

const model = mongoose.model("Fund", fundSchema);

export const schema = model.schema;
export default model;
