import { model, Schema } from "mongoose";
import UserModel, { IUserSchema } from "./userModel";

export interface IProfileItemSchema {
  title: string;
  isActive?: boolean;
  whitelist?: string[];
  blacklist?: string[];
}

export interface IProfileSchema {
  user: IUserSchema["telegramId"];
  profiles: IProfileItemSchema[];
}

const profileSchema = new Schema<IProfileSchema>({
  user: {
    type: Number,
    ref: UserModel,
    required: true,
    unique: true,
  },
  profiles: [
    {
      title: {
        type: String,
        required: true,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
      whitelist: {
        type: [String],
        default: [],
      },
      blacklist: {
        type: [String],
        default: [],
      },
    },
  ],
});

export const ProfileModel = model<IProfileSchema>("Profile", profileSchema);

export default ProfileModel;
