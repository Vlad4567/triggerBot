import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { startKeyboard } from "../../../commands/botKeyboards";

export const showMenu = async (ctx: Context<Update>) => {
  await ctx.reply("Choose an option:", startKeyboard);
};