import { model, Schema } from "mongoose";
import UserModel, { IUserSchema } from "./userModel";

export interface IChannelSchema {
  channelName: string;
  channelId: string;
  accessHash: string;
  link: string;
  users: IUserSchema['telegramId'][];
}

const channelSchema = new Schema<IChannelSchema>({
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
  users: {
    type: [Number],
    ref: UserModel,
    required: true,
  },
});

export const ChannelModel = model<IChannelSchema>("Channel", channelSchema);

export default ChannelModel;
