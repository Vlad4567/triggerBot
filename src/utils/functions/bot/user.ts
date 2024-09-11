import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import UserModel from "../../../models/userModel";

export const createNewUserCollection = async (ctx: Context<Update>) => {
  if (!ctx.from) {
    throw new Error("User information is missing");
  }

  const userId = ctx.from.id;

  const newUserModel = new UserModel({
    telegramId: userId,
    isBot: ctx.from.is_bot,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await newUserModel.save();
  return newUserModel;
};
