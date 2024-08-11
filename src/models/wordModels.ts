import mongoose from "mongoose";

const wordSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
  },
  words: {
    type: Array(String),
    required: true,
  },
});

export default mongoose.model("Word", wordSchema, "words");
