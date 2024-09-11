import { Context, Telegraf } from "telegraf";
import DarkWordModel from "../../models/darkWordsModel";
import { Update } from "telegraf/typings/core/types/typegram";
import botActions from "../../commands/botActions";
import { userStates } from "../..";
import { CANCEL_COMMAND, startKeyboard } from "../../commands/botKeyboards";
import { handleError } from "../../middlewares/errorHandler";
import { showMenu } from "../../utils/functions/bot/context";

export const addDarkWord = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    userStates.set(ctx.from.id, botActions.addDarkWord);

    const replyProvideWords = () => {
      ctx.reply(
        `Please provide dark word(s) to add or type "${CANCEL_COMMAND}" to cancel`,
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

export const darkWordList = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const wordsCollection = await DarkWordModel.findOne({ user: ctx.from.id });
    if (wordsCollection) {
      const wordList = wordsCollection?.darkWords.join(", ");
      await ctx.reply(`Dark words: ${wordList}`, startKeyboard);
    } else {
      await ctx.reply("No dark words found.", startKeyboard)
    }
  } catch (err) {
    handleError(ctx, err);
  }
}

export const deleteDarkWords = async (ctx: Context<Update>, bot: Telegraf<Context<Update>>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const wordsCollection = await DarkWordModel.findOne({ user: ctx.from.id });

    if (!wordsCollection || wordsCollection.darkWords.length === 0) {
      await ctx.reply("No dark words to delete.");
      await showMenu(ctx)
      return;
    }

    const createMatrix = (words: typeof wordsCollection, columns = 8) => {
      return words.darkWords.reduce((matrix, word, index) => {
        const row = Math.floor(index / columns);
        if (!matrix[row]) matrix[row] = [];
        matrix[row].push({
          text: word,
          callback_data: `${word}${words.user}_deleteDarkWord`,
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

      wordsCollection.darkWords.forEach((word) => {
        const actionId = `${word}${wordsCollection.user}_deleteDarkWord`;
        bot.action(actionId, async (actionCtx) => {
          const updatedCollection = await DarkWordModel.findOneAndUpdate(
            { user: ctx.from!.id },
            { $pull: { darkWords: word } },
            { new: true }
          );

          if (!updatedCollection || updatedCollection.darkWords.length === 0) {
            await DarkWordModel.deleteOne({ user: ctx.from!.id });
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