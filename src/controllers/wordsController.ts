import { Context, Telegraf } from "telegraf";
import Word from "../models/wordModels";
import { Update } from "telegraf/typings/core/types/typegram";
import botActions from "../commands/botActions";
import { userStates } from "..";
import { startKeyboard } from "../commands/botKeyboards";

const CANCEL_COMMAND = "cancel";

export default (bot: Telegraf<Context<Update>>) => {
  bot.action(botActions.addWord, async (ctx) => {
    try {
      userStates.set(ctx.from.id, botActions.addWord);

      const replyProvideWords = () => {
        ctx.reply(
          `Please provide word(s) to add or type "/${CANCEL_COMMAND}" to cancel`,
          {
            reply_markup: {
              keyboard: [[{ text: `/${CANCEL_COMMAND}` }]],
            },
          }
        );
      };

      replyProvideWords();
    } catch (err) {
      ctx.reply("An error occurred while adding the word.");
    }
  });

  bot.action(botActions.listWords, async (ctx) => {
    try {
      const words = await Word.find({ userId: ctx.from.id });
      const wordList = words.map((w) => w.word).join(", ");
      ctx.reply(`Words: ${wordList}`);
    } catch (err) {
      ctx.reply("An error occurred while retrieving the words.");
    }
  });

  bot.action(botActions.deleteWords, async (ctx) => {
    try {
      let words = await Word.find({ userId: ctx.from.id });

      if (words.length !== 0) {
        const createMatrix = (arr: typeof words, columns = 8) => {
          const rows = Math.floor(arr.length / columns);
          const remainder = arr.length % columns;
          const matrix = [];

          for (let i = 0; i < rows; i++) {
            const row = arr
              .slice(i * columns, (i + 1) * columns)
              .map((word, j) => ({
                text: word.word,
                callback_data: word.word + word.userId + ctx.from.id + "_delete",
              }));
            matrix.push(row);
          }

          if (remainder > 0) {
            const lastRow = arr.slice(rows * columns).map((word, j) => ({
              text: word.word,
              callback_data: word.word + word.userId + ctx.from.id + "_delete",
            }));
            matrix.push(lastRow);
          }

          return matrix;
        };

        const generateKeyboard = async () => {
          await ctx.reply("Choose a word to delete:", {
            reply_markup: {
              inline_keyboard: createMatrix(words),
            },
          });

          words.forEach((word) => {
            bot.action(word.word + word.userId + ctx.from.id + "_delete", async (ctx) => {
              await Word.deleteOne({ word: word.word, userId: word.userId });
              
              words = await Word.find({ userId: ctx.from.id });
              await ctx.reply("Word deleted.", {
                reply_markup: {
                  keyboard: [[{ text: "/start" }]],
                },
              });
              bot.action(word.word + word.userId + ctx.from.id + "_delete", () => {});
              generateKeyboard();
            });
          });
        };

        if (words.length !== 0) {
          await generateKeyboard();
        } else {
          await ctx.reply("No channels to delete.");
          await ctx.reply("Choose your option", startKeyboard);
        }
      } else {
        await ctx.reply("No words to delete.");
        await ctx.reply("Choose your option", startKeyboard);
      }
    } catch (err) {
      ctx.reply("An error occurred while deleting the word.");
    }
  });
};
