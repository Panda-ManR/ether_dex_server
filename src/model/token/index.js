import mongoose, { Schema } from "mongoose";

const tokenSchema = new Schema(
  {
    address: {
      type: String,
      required: true,
      index: true
    },
    symbol: {
      type: String,
      required: true
    },
    decimals: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description1: {
      type: String,
      required: true
    },
    description2: {
      type: String,
      required: true
    },
    website: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

tokenSchema.methods = {
  view() {
    let view = {};

    let fields = [
      "_id",
      "address",
      "symbol",
      "decimals",
      "name",
      "description1",
      "description2",
      "website"
    ];

    fields.forEach(field => {
      view[field] = this[field];
    });

    return view;
  }
};

const model = mongoose.model("Token", tokenSchema);

export const schema = model.schema;
export default model;
