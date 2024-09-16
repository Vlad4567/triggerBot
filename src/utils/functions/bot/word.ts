import WordModel, { IWordsSchema } from "../../../models/wordsModel";
import mongoose, { Document } from "mongoose";

export const createNewWordCollection = async (user: number, word?: string) => {
  const newWord = new WordModel({
    words: word ? [word] : [],
    user,
  });
  await newWord.save();

  return newWord;
};

export const addWordToExistingCollection = async (
  word: string,
  wordsCollection: Document<unknown, {}, IWordsSchema> &
    IWordsSchema & {
      _id: mongoose.Types.ObjectId;
    }
) => {
  wordsCollection.words.push(word);
  await wordsCollection.save();
};
