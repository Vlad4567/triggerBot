import { Context, Telegraf } from "telegraf";
import WordModel from "../../models/wordsModel";
import { Update } from "telegraf/typings/core/types/typegram";
import botActions from "../../commands/botActions";
import { userStates } from "../..";
import { CANCEL_COMMAND, startKeyboard } from "../../commands/botKeyboards";
import { handleError } from "../../middlewares/errorHandler";
import { showMenu } from "../../utils/functions/bot/context";

export const addWord = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    userStates.set(ctx.from.id, botActions.addWord);

    const replyProvideWords = () => {
      ctx.reply(
        `Please provide word(s) to add or type "${CANCEL_COMMAND}" to cancel`,
        {
          reply_markup: {
            keyboard: [[{ text: CANCEL_COMMAND }]],
          },
        }
      );
    };

    replyProvideWords();
  } catch (err) {
    handleError(ctx, err);
  }
}

export const wordList = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const wordsCollection = await WordModel.findOne({ user: ctx.from.id });
    if (wordsCollection) {
      const wordList = wordsCollection?.words.join(", ");
      await ctx.reply(`Words: ${wordList}`, startKeyboard);
    } else {
      await ctx.reply("No words found.", startKeyboard)
    }
  } catch (err) {
    handleError(ctx, err);
  }
}

export const deleteWords = async (ctx: Context<Update>, bot: Telegraf<Context<Update>>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const wordsCollection = await WordModel.findOne({ user: ctx.from.id });

    if (!wordsCollection || wordsCollection.words.length === 0) {
      await ctx.reply("No words to delete.");
      await showMenu(ctx)
      return;
    }

    const createMatrix = (words: typeof wordsCollection, columns = 8) => {
      return words.words.reduce((matrix, word, index) => {
        const row = Math.floor(index / columns);
        if (!matrix[row]) matrix[row] = [];
        matrix[row].push({
          text: word,
          callback_data: `${word}${words.user}_deleteWord`,
        });
        return matrix;
      }, [] as Array<Array<{ text: string; callback_data: string }>>);
    };

    const generateKeyboard = async (collection: typeof wordsCollection) => {
      await ctx.reply("Choose a word to delete:", {
        reply_markup: {
          inline_keyboard: createMatrix(collection),
        },
      });

      wordsCollection.words.forEach((word) => {
        const actionId = `${word}${wordsCollection.user}_deleteWord`;
        bot.action(actionId, async (actionCtx) => {
          const updatedCollection = await WordModel.findOneAndUpdate(
            { user: ctx.from!.id },
            { $pull: { words: word } },
            { new: true }
          );

          if (!updatedCollection || updatedCollection.words.length === 0) {
            await WordModel.deleteOne({ user: ctx.from!.id });
            await actionCtx.reply("No words left.", startKeyboard);
          } else {
            generateKeyboard(updatedCollection);
          }

          bot.action(actionId, () => {});
        });
      });
    };

    await generateKeyboard(wordsCollection);
  } catch (err) {
    handleError(ctx, err);
  }
}