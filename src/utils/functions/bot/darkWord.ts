import DarkWordModel, { IDarkWordsSchema } from "../../../models/darkWordsModel";
import mongoose, { Document } from "mongoose";

export const createNewDarkWordCollection = async (
  user: number,
  word?: string,
) => {
  const newWord = new DarkWordModel({
    darkWords: word ? [word] : [],
    user,
  });
  await newWord.save();

  return newWord;
};

export const addDarkWordToExistingCollection = async (
  word: string,
  wordsCollection: Document<unknown, {}, IDarkWordsSchema> &
  IDarkWordsSchema & {
      _id: mongoose.Types.ObjectId;
    },
) => {
  wordsCollection.darkWords.push(word);
  await wordsCollection.save();
};
