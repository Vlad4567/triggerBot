import { Context, Telegraf } from "telegraf";
import Words from "../models/wordModels";
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
      const wordsCollection = await Words.findOne({ userId: ctx.from.id });
      if (wordsCollection) {
        const wordList = wordsCollection?.words.join(", ");
        await ctx.reply(`Words: ${wordList}`);
      } else {
        await ctx.reply("No words found.")
      }
    } catch (err) {
      await ctx.reply("An error occurred while retrieving the words.");
    }
  });

  bot.action(botActions.deleteWords, async (ctx) => {
    try {
      let wordsCollection = (await Words.findOne({ userId: ctx.from.id }))!;

      if (wordsCollection?.words.length !== 0 && wordsCollection) {
        const createMatrix = (words: typeof wordsCollection, columns = 8) => {
          const rows = Math.floor(words.words.length / columns);
          const remainder = words.words.length % columns;
          const matrix = [];

          for (let i = 0; i < rows; i++) {
            const row = words.words
              .slice(i * columns, (i + 1) * columns)
              .map((word, j) => ({
                text: word,
                callback_data: word + words.userId + ctx.from.id + "_delete",
              }));
            matrix.push(row);
          }

          if (remainder > 0) {
            const lastRow = words.words.slice(rows * columns).map((word, j) => ({
              text: word,
              callback_data: word + words.userId + ctx.from.id + "_delete",
            }));
            matrix.push(lastRow);
          }

          return matrix;
        };

        const generateKeyboard = async () => {
          await ctx.reply("Choose a word to delete:", {
            reply_markup: {
              inline_keyboard: createMatrix(wordsCollection),
            },
          });

          wordsCollection.words.forEach((word) => {
            bot.action(word + wordsCollection.userId + ctx.from.id + "_delete", async (ctx) => {
              const wordsCollectionToDelete = (await Words.findOne({ userId: ctx.from.id }))!


              wordsCollectionToDelete.words = wordsCollectionToDelete.words.filter(item => item !== word)
              if (wordsCollectionToDelete.words.length === 0) {
                await Words.deleteOne({userId: ctx.from.id})
              } else {
                await wordsCollectionToDelete.save();
              }
              
              wordsCollection = wordsCollectionToDelete;
              await ctx.reply("Word deleted.", {
                reply_markup: {
                  keyboard: [[{ text: "/start" }]],
                },
              });
              bot.action(word + wordsCollection.userId + ctx.from.id + "_delete", () => {});
              if (wordsCollection.words.length === 0) {
                await ctx.reply("No words left.", {
                  reply_markup: {
                    keyboard: [[{ text: "/start" }]],
                  },
                });
              } else {
                generateKeyboard();
              }
            });
          });
        };

        if (wordsCollection.words.length !== 0) {
          await generateKeyboard();
        } else {
          await ctx.reply("No words to delete.");
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
