import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

import botActions from "../../commands/botActions";
import { addProfile, allProfiles } from "../../controllers/bot/profiles.controller";

export default (bot: Telegraf<Context<Update>>) => {
  bot.action(botActions.addProfile, addProfile);

  bot.action(botActions.allProfiles, allProfiles);
};
