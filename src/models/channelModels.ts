import mongoose from "mongoose";

const channelSchema = new mongoose.Schema({
  channelName: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  accessHash: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  userIds: {
    type: Array(Number),
    required: true,
  },
});

export default mongoose.model("Channel", channelSchema, "channels");
