import { Schema, model, Document } from "mongoose";

export interface IUserSchema extends Document {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isBot: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserSchema>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
    },
    isBot: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const UserModel = model<IUserSchema>("User", userSchema);

export default UserModel;
