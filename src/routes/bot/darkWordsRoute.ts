import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

import botActions from "../../commands/botActions";
import { addDarkWord, darkWordList, deleteDarkWords } from "../../controllers/bot/darkWordsController";

export default (bot: Telegraf<Context<Update>>) => {
  bot.action(botActions.addDarkWord, addDarkWord);

  bot.action(botActions.darkWordList, darkWordList);

  bot.action(botActions.deleteDarkWords, (ctx) => deleteDarkWords(ctx, bot));
};
