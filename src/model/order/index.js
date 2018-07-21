import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
  {
    amount: {
      type: String,
      required: true
    },
    price: {
      type: String,
      required: true
    },
    tokenGet: {
      type: String,
      required: true
    },
    amountGet: {
      type: String,
      required: true
    },
    tokenGive: {
      type: String,
      required: true
    },
    amountGive: {
      type: String,
      required: true
    },
    expires: {
      type: String,
      required: true
    },
    nonce: {
      type: String,
      required: true
    },
    v: {
      type: Number,
      required: true
    },
    r: {
      type: String,
      required: true
    },
    s: {
      type: String,
      required: true
    },
    user: {
      type: String,
      required: true
    },
    availableVolume: {
      type: String,
      required: true
    },
    amountFilled: {
      type: String,
      required: true
    },
    deleted: {
      type: Boolean,
      required: true,
      default: false
    },
    type: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true
  }
);

orderSchema.methods = {
  view() {
    let view = {};

    let fields = [
      "_id",
      "amount",
      "price",
      "tokenGet",
      "amountGet",
      "tokenGive",
      "amountGive",
      "expires",
      "nonce",
      "v",
      "r",
      "s",
      "user",
      "availableVolume",
      "amountFilled",
      "type"
    ];

    fields.forEach(field => {
      view[field] = this[field];
    });

    return view;
  }
};

const model = mongoose.model("Order", orderSchema);

export const schema = model.schema;
export default model;
