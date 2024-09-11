import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import WordModel, { IWordsSchema } from "../../../models/wordsModel";
import mongoose, { Document } from "mongoose";

export const createNewWordCollection = async (
  word: string,
  user: number,
  ctx: Context<Update>
) => {
  const newWord = new WordModel({
    words: [word],
    user,
  });
  await newWord.save();
  await ctx.reply("Word received: " + word);

  return newWord;
};

export const addWordToExistingCollection = async (
  word: string,
  wordsCollection: Document<unknown, {}, IWordsSchema> &
    IWordsSchema & {
      _id: mongoose.Types.ObjectId;
    },
  ctx: Context<Update>
) => {
  wordsCollection.words.push(word);
  await wordsCollection.save();
  await ctx.reply("Word received: " + word);
};
