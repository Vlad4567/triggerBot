import { model, Schema } from "mongoose";
import UserModel, { IUserSchema } from "./userModel";

export interface IDarkWordsSchema {
  user: IUserSchema["telegramId"];
  darkWords: string[];
}

const darkWordsSchema = new Schema<IDarkWordsSchema>({
  user: {
    type: Number,
    ref: UserModel,
    required: true,
    unique: true,
  },
  darkWords: {
    type: [String],
    required: true,
  },
});

export const DarkWordsModel = model<IDarkWordsSchema>("DarkWords", darkWordsSchema);

export default DarkWordsModel;
