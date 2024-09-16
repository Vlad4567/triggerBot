import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

import { botCancel, botSettings, botStart, botText, useAddUser } from "../../controllers/bot/botController";
import { CANCEL_COMMAND } from "../../commands/botKeyboards";
import botActions from "../../commands/botActions";

export default (bot: Telegraf<Context<Update>>) => {
  bot.use(useAddUser);

  bot.command("start", botStart);

  bot.action(botActions.settings, botSettings);

  bot.command(CANCEL_COMMAND.slice(1), botCancel);
  bot.action(CANCEL_COMMAND, botCancel);

  bot.on("text", botText);
};
