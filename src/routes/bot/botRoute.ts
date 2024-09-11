import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

import { botCancel, botStart, botText, useAddUser } from "../../controllers/bot/botController";
import { CANCEL_COMMAND } from "../../commands/botKeyboards";

export default (bot: Telegraf<Context<Update>>) => {
  bot.use(useAddUser);

  bot.command("start", botStart);

  bot.command(CANCEL_COMMAND.slice(1), botCancel);

  bot.on("text", botText);
};
