import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import DarkWordModel, { IDarkWordsSchema } from "../../../models/darkWordsModel";
import mongoose, { Document } from "mongoose";

export const createNewDarkWordCollection = async (
  word: string,
  user: number,
  ctx: Context<Update>
) => {
  const newWord = new DarkWordModel({
    darkWords: [word],
    user,
  });
  await newWord.save();
  await ctx.reply("Dark word received: " + word);

  return newWord;
};

export const addDarkWordToExistingCollection = async (
  word: string,
  wordsCollection: Document<unknown, {}, IDarkWordsSchema> &
  IDarkWordsSchema & {
      _id: mongoose.Types.ObjectId;
    },
  ctx: Context<Update>
) => {
  wordsCollection.darkWords.push(word);
  await wordsCollection.save();
  await ctx.reply("Word received: " + word);
};
