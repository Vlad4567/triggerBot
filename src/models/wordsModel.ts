import { model, Schema } from "mongoose";
import UserModel, { IUserSchema } from "./userModel";

export interface IWordsSchema {
  user: IUserSchema["telegramId"];
  words: string[];
}

const wordsSchema = new Schema<IWordsSchema>({
  user: {
    type: Number,
    ref: UserModel,
    required: true,
  },
  words: {
    type: [String],
    required: true,
  },
});

export const WordsModel = model<IWordsSchema>("Words", wordsSchema);

export default WordsModel;
