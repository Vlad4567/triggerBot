import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { userStates } from "../..";
import botActions from "../../commands/botActions";
import { handleError } from "../../middlewares/errorHandler";
import { CANCEL_COMMAND } from "../../commands/botKeyboards";
import { ISharedSettingsSchema } from "../../schemas/sharedSettingsSchema";
import WordsModel from "../../models/wordsModel";
import DarkWordsModel from "../../models/darkWordsModel";
import ChannelModel from "../../models/channelModel";
import { showMenu } from "../../utils/functions/bot/context";

export const importSettings = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    userStates.set(ctx.from.id, botActions.importSettings);

    const replyProvideWords = () => {
      ctx.reply(
        `Please provide settings token that user shared with you or type "${CANCEL_COMMAND}" to cancel`,
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
};

export const exportSettings = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    await ctx.reply(
      `Please provide numbers of settings that you want to export or click "All settings" to export all settings\n
      1. Whitelist\n
      2. Blacklist\n
      3. Channels\n`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "All settings",
                callback_data: botActions.exportAllSettings,
              },
            ],
            [
              {
                text: "Back",
                callback_data: botActions.settings,
              },
            ],
          ],
        },
      }
    );

    userStates.set(ctx.from.id, botActions.exportSettings);
  } catch (err) {
    handleError(ctx, err);
  }
};

interface IEncodeSettings {
  whitelist?: boolean;
  blacklist?: boolean;
  channels?: boolean;
}

export const encodeSettings = async (
  ctx: Context<Update>,
  settings: IEncodeSettings
) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    userStates.delete(ctx.from.id);

    const settingsToEncode: ISharedSettingsSchema = { user: ctx.from.id };

    if (settings.whitelist) {
      settingsToEncode.whitelist = (
        await WordsModel.findOne({
          user: ctx.from.id,
        })
      )?.words;
      if (!settingsToEncode.whitelist) {
        delete settingsToEncode.whitelist;
      }
    }

    if (settings.blacklist) {
      settingsToEncode.blacklist = (
        await DarkWordsModel.findOne({
          user: ctx.from.id,
        })
      )?.darkWords;
      if (!settingsToEncode.blacklist) {
        delete settingsToEncode.blacklist;
      }
    }

    if (settings.channels) {
      settingsToEncode.channels = (
        await ChannelModel.find({
          users: ctx.from.id,
        })
      )?.map((channel) => ({
        channelId: channel.channelId,
        accessHash: channel.accessHash,
      }));
      if (!settingsToEncode.channels) {
        delete settingsToEncode.channels;
      }
    }

    const encodedSettings = Buffer.from(
      JSON.stringify(settingsToEncode)
    ).toString("base64");

    await ctx.reply("Here is your settings token:");
    await ctx.reply(encodedSettings);
    await showMenu(ctx);
  } catch (err) {
    handleError(ctx, err);
  }
};
