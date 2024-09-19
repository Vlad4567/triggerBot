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
import ProfileModel from "../../models/profile.model";
import { bot } from "../../services/bot";

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

interface IEncodeSettingsProfile {
  title: string;
  whitelist: string[];
  blacklist: string[];
}

interface IEncodeSettings {
  profiles: IEncodeSettingsProfile[];
  whitelist: boolean;
  blacklist: boolean;
  channels: boolean;
}

export const exportSettings = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const callbackData = {
      profiles: botActions.exportAllSettings + ctx.from.id + "profiles",
      whitelist: botActions.exportAllSettings + ctx.from.id + "whitelist",
      blacklist: botActions.exportAllSettings + ctx.from.id + "blacklist",
      channels: botActions.exportAllSettings + ctx.from.id + "channels",
      generate: botActions.exportAllSettings + ctx.from.id + "generate",
      cancel: botActions.exportAllSettings + ctx.from.id + "cancel",
    };

    const profileModel = await ProfileModel.findOne({
      user: ctx.from.id,
    });

    const settings: IEncodeSettings = {
      profiles: [],
      whitelist: false,
      blacklist: false,
      channels: false,
    };

    const getStrStatus = (setting: boolean) => (setting ? "🟢" : "🔴");

    const mainSettings = async () => {
      await ctx.reply(`Please configure settings you would like to export`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `${settings.profiles.length}/${
                  profileModel?.profiles.length || 0
                } Profiles`,
                callback_data: callbackData.profiles,
              },
            ],
            [
              {
                text: `${getStrStatus(settings.whitelist)} Whitelist`,
                callback_data: callbackData.whitelist,
              },
              {
                text: `${getStrStatus(settings.blacklist)} Blacklist`,
                callback_data: callbackData.blacklist,
              },
              {
                text: `${getStrStatus(settings.channels)} Channels`,
                callback_data: callbackData.channels,
              },
            ],
            [
              {
                text: "Generate",
                callback_data: callbackData.generate,
              },
              {
                text: "All",
                callback_data: botActions.exportAllSettings,
              },
              {
                text: "Back",
                callback_data: botActions.settings,
              },
            ],
          ],
        },
      });
    };

    await mainSettings();

    if (profileModel) {
      bot.action(callbackData.profiles, async () => {
        const getCallbackData = (word: string) =>
          callbackData.profiles + word;
  
        const createMatrix = (
          profiles: typeof profileModel.profiles,
          columns = 3
        ) => {
          const result = profiles.reduce((matrix, profile, index) => {
            const row = Math.floor(index / columns);
            if (!matrix[row]) matrix[row] = [];
            matrix[row].push({
              text: `${getStrStatus(settings.profiles.some(item => item.title === profile.title))} ${profile.title}`,
              callback_data: getCallbackData(profile.title),
            });
            return matrix;
          }, [] as Array<Array<{ text: string; callback_data: string }>>);
  
          result.push([
            { text: "Back", callback_data: callbackData.cancel },
          ]);
  
          return result;
        };
  
        const generateKeyboard = async (
          collection: typeof profileModel.profiles
        ) => {
          await ctx.reply("Choose a profile to toggle:", {
            reply_markup: {
              inline_keyboard: createMatrix(collection),
            },
          });
  
          collection.forEach((profile) => {
            bot.action(getCallbackData(profile.title), async () => {
              if (settings.profiles.some(item => item.title === profile.title)) {
                settings.profiles = settings.profiles.filter(item => item.title !== profile.title);
              } else {
                settings.profiles.push({
                  title: profile.title,
                  whitelist: profile.whitelist || [],
                  blacklist: profile.blacklist || [],
                });
              }

              generateKeyboard(profileModel.profiles);
            });
          });
        };

        generateKeyboard(profileModel.profiles);
      })
    }

    bot.action(callbackData.whitelist, async () => {
      settings.whitelist = !settings.whitelist;
      await mainSettings();
    });

    bot.action(callbackData.blacklist, async () => {
      settings.blacklist = !settings.blacklist;
      await mainSettings();
    });

    bot.action(callbackData.channels, async () => {
      settings.channels = !settings.channels;
      await mainSettings();
    });

    bot.action(callbackData.generate, async () => {
      encodeSettings(ctx, settings);
    });

    bot.action(callbackData.cancel, async () => {
      if (ctx.from) {
        userStates.delete(ctx.from?.id)
      }

      await mainSettings();
    });
  } catch (err) {
    handleError(ctx, err);
  }
};

export const encodeSettings = async (
  ctx: Context<Update>,
  settings: IEncodeSettings | true
) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const settingsToEncode: ISharedSettingsSchema = { user: ctx.from.id };

    if (settings === true || settings.whitelist) {
      settingsToEncode.whitelist = (
        await WordsModel.findOne({
          user: ctx.from.id,
        })
      )?.words;
      if (!settingsToEncode.whitelist) {
        delete settingsToEncode.whitelist;
      }
    }

    if (settings === true || settings.blacklist) {
      settingsToEncode.blacklist = (
        await DarkWordsModel.findOne({
          user: ctx.from.id,
        })
      )?.darkWords;
      if (!settingsToEncode.blacklist) {
        delete settingsToEncode.blacklist;
      }
    }

    if (settings === true || settings.channels) {
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

    if (settings === true || settings.profiles.length > 0) {
      if (settings === true) {
        const profileModel = await ProfileModel.findOne({ user: ctx.from.id })

        settingsToEncode.profiles = profileModel?.profiles.map(profile => ({
          title: profile.title,
          whitelist: profile.whitelist || [],
          blacklist: profile.blacklist || [],
        }))
      } else {
        settingsToEncode.profiles = settings.profiles
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
