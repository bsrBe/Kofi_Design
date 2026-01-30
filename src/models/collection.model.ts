import mongoose from "mongoose";
import type { ICollection } from "./types.js";

const collectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String
  },
  tags: {
    type: [String],
    default: []
  }
}, { timestamps: true });

const Collection = mongoose.model<ICollection>("Collection", collectionSchema);

export default Collection;
