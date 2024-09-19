import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

import botActions from "../../commands/botActions";
import { encodeSettings, exportSettings, importSettings } from "../../controllers/bot/settings";

export default (bot: Telegraf<Context<Update>>) => {
  bot.action(botActions.importSettings, importSettings);

  bot.action(botActions.exportSettings, exportSettings);
  bot.action(botActions.exportAllSettings, (ctx) => encodeSettings(ctx, true))
};
