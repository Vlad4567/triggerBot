import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

import { addWord, deleteWords, wordList } from "../../controllers/bot/wordsController";
import botActions from "../../commands/botActions";

export default (bot: Telegraf<Context<Update>>) => {
  bot.action(botActions.addWord, addWord);

  bot.action(botActions.wordList, wordList);

  bot.action(botActions.deleteWords, (ctx) => deleteWords(ctx, bot));
};
