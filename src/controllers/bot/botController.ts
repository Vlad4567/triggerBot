import { sharedSettingsSchema } from "./../../schemas/sharedSettingsSchema";
import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { users, userStates } from "../..";
import botActions from "../../commands/botActions";
import ChannelModel from "../../models/channelModel";
import WordsModel from "../../models/wordsModel";
import DarkWordModel from "../../models/darkWordsModel";
import {
  CANCEL_COMMAND,
  IKeyboard,
  IKeyboardButton,
  settingsKeyboard,
} from "../../commands/botKeyboards";
import { handleError } from "../../middlewares/errorHandler";
import UserModel from "../../models/userModel";
import {
  addNewChannel,
  addUserToExistingChannel,
  checkIfJoined,
  getChannelUsername,
  resolveChannel,
} from "../../utils/functions/bot/channel";
import {
  addWordToExistingCollection,
  createNewWordCollection,
} from "../../utils/functions/bot/word";
import { createNewUserCollection } from "../../utils/functions/bot/user";
import { showMenu } from "../../utils/functions/bot/context";
import {
  addDarkWordToExistingCollection,
  createNewDarkWordCollection,
} from "../../utils/functions/bot/darkWord";
import { bot } from "../../services/bot";
import { encodeSettings } from "./settings";
import ProfileModel, { IProfileItemSchema } from "../../models/profile.model";

const handleAddChannel = async (ctx: Context<Update>) => {
  const replyProvideChannels = async () => {
    await ctx.reply(
      `Please provide channels one by one or through list in one of the following ways to add: "https://t.me/UkraineThai1", "@UkraineThai1" or type "${CANCEL_COMMAND}" to cancel`,
      {
        reply_markup: {
          keyboard: [[{ text: CANCEL_COMMAND }]],
        },
      }
    );
  };

  const message =
    ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";
  const links = message.split(/\s+/);

  for (const link of links) {
    const channelLink = link.startsWith("@")
      ? link.slice(1)
      : link.split("/").slice(-1)[0];

    try {
      const channel = await resolveChannel(channelLink);
      const channelDB = await ChannelModel.findOne({
        channelId: channel.chats[0].id,
      });

      if (channelDB?.users.includes(ctx.from!.id)) {
        await ctx.reply(`You have already added the channel: ${link}`);
      } else if (channelDB) {
        await addUserToExistingChannel(channelDB, ctx);
      } else if (await checkIfJoined(channel)) {
        await ctx.reply(
          `The channel ${link} is not included into folder (unavailable for now)`
        );
      } else {
        await addNewChannel(channel, link, ctx);
      }
    } catch (err) {
      handleError(ctx, err);
    }
  }

  await replyProvideChannels();
};

const handleAddWord = async (ctx: Context<Update>) => {
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

  const word = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const user = ctx.from!.id;
  const wordsCollection = await WordsModel.findOne({ user });

  if (!wordsCollection) {
    await createNewWordCollection(user, word);
    await ctx.reply("Word received: " + word);
  } else {
    const hasDuplicate = wordsCollection.words.some(
      (item) => item.toLowerCase() === word.toLowerCase()
    );

    if (!hasDuplicate) {
      await addWordToExistingCollection(word, wordsCollection);
      await ctx.reply("Word received: " + word);
    } else {
      await ctx.reply("Word already exists.");
    }
  }

  replyProvideWords();
};

const handleAddDarkWord = async (ctx: Context<Update>) => {
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

  const word = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const user = ctx.from!.id;
  const wordsCollection = await DarkWordModel.findOne({ user });

  if (!wordsCollection) {
    await createNewDarkWordCollection(user, word);
    await ctx.reply("Dark word received: " + word);
  } else {
    const hasDuplicate = wordsCollection.darkWords.some(
      (item) => item.toLowerCase() === word.toLowerCase()
    );

    if (!hasDuplicate) {
      await addDarkWordToExistingCollection(word, wordsCollection);
      await ctx.reply("Word received: " + word);
    } else {
      await ctx.reply("Dark word already exists.");
    }
  }

  replyProvideWords();
};

const handleImportSettings = async (ctx: Context<Update>) => {
  try {
    const message =
      ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";

    const decodedData = sharedSettingsSchema.parse(
      JSON.parse(Buffer.from(message, "base64").toString())
    );

    const keyboard: IKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Back", callback_data: botActions.settings }],
        ],
      },
    };

    if (decodedData.whitelist) {
      const btn: IKeyboardButton = {
        text: "Whitelist",
        callback_data: (botActions.importWhitelist +
          ctx.from?.id) as IKeyboardButton["callback_data"],
      };

      if (keyboard.reply_markup.inline_keyboard.length === 1) {
        keyboard.reply_markup.inline_keyboard.unshift([btn]);
      } else {
        keyboard.reply_markup.inline_keyboard[0].push(btn);
      }

      bot.action(btn.callback_data, async () => {
        const callbackData = {
          replace: btn.callback_data + "_replace",
          add: btn.callback_data + "_add",
          importedSettings:
            botActions.importSettings + ctx.from?.id + "imported",
        };

        await ctx.reply(`Replace or add "whitelist words"?`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Replace",
                  callback_data: callbackData.replace,
                },
                {
                  text: "Add",
                  callback_data: callbackData.add,
                },
              ],
              [
                {
                  text: "Back",
                  callback_data: callbackData.importedSettings,
                },
              ],
            ],
          },
        });

        bot.action(callbackData.importedSettings, async () => {
          await ctx.reply("Settings:", keyboard);
        });

        bot.action(callbackData.replace, async () => {
          try {
            if (!ctx.from || !decodedData.whitelist) {
              throw new Error("User information is missing");
            }

            await ctx.reply("Replacing...");
            let wordsModel = await WordsModel.findOne({ user: ctx.from.id });

            if (!wordsModel) {
              wordsModel = await createNewWordCollection(ctx.from.id);
            }

            wordsModel.words = decodedData.whitelist.slice();

            await wordsModel.save();

            keyboard.reply_markup.inline_keyboard[0] =
              keyboard.reply_markup.inline_keyboard[0].filter(
                (item) => item.callback_data !== btn.callback_data
              );

            await ctx.reply("Whitelist replaced.");
            await ctx.reply("Settings:", keyboard);
          } catch (err) {
            handleError(ctx, err);
          }
        });

        bot.action(callbackData.add, async () => {
          try {
            if (!ctx.from || !decodedData.whitelist) {
              throw new Error("User information is missing");
            }

            await ctx.reply("Adding...");
            let wordsModel = await WordsModel.findOne({ user: ctx.from.id });

            if (!wordsModel) {
              wordsModel = await createNewWordCollection(ctx.from.id);
            }

            wordsModel.words = [
              ...new Set([
                ...wordsModel.words,
                ...decodedData.whitelist.slice(),
              ]),
            ];

            await wordsModel.save();

            keyboard.reply_markup.inline_keyboard[0] =
              keyboard.reply_markup.inline_keyboard[0].filter(
                (item) => item.callback_data !== btn.callback_data
              );

            await ctx.reply("Whitelist added.");
            await ctx.reply("Settings:", keyboard);
          } catch (err) {
            handleError(ctx, err);
          }
        });
      });
    }

    if (decodedData.blacklist) {
      const btn: IKeyboardButton = {
        text: "Blacklist",
        callback_data: (botActions.importBlacklist +
          ctx.from?.id) as IKeyboardButton["callback_data"],
      };

      if (keyboard.reply_markup.inline_keyboard.length === 1) {
        keyboard.reply_markup.inline_keyboard.unshift([btn]);
      } else {
        keyboard.reply_markup.inline_keyboard[0].push(btn);
      }

      bot.action(btn.callback_data, async () => {
        const callbackData = {
          replace: btn.callback_data + "_replace",
          add: btn.callback_data + "_add",
          importedSettings:
            botActions.importSettings + ctx.from?.id + "imported",
        };

        await ctx.reply(`Replace or add "blacklist words"?`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Replace",
                  callback_data: callbackData.replace,
                },
                {
                  text: "Add",
                  callback_data: callbackData.add,
                },
              ],
              [
                {
                  text: "Back",
                  callback_data: callbackData.importedSettings,
                },
              ],
            ],
          },
        });

        bot.action(callbackData.importedSettings, async () => {
          await ctx.reply("Settings:", keyboard);
        });

        bot.action(callbackData.replace, async () => {
          try {
            if (!ctx.from || !decodedData.blacklist) {
              throw new Error("User information is missing");
            }

            await ctx.reply("Replacing...");
            let blacklistModel = await DarkWordModel.findOne({
              user: ctx.from.id,
            });

            if (!blacklistModel) {
              blacklistModel = await createNewDarkWordCollection(ctx.from.id);
            }

            blacklistModel.darkWords = decodedData.blacklist.slice();

            await blacklistModel.save();

            keyboard.reply_markup.inline_keyboard[0] =
              keyboard.reply_markup.inline_keyboard[0].filter(
                (item) => item.callback_data !== btn.callback_data
              );

            await ctx.reply("Blacklist replaced.");
            await ctx.reply("Settings:", keyboard);
          } catch (err) {
            handleError(ctx, err);
          }
        });

        bot.action(callbackData.add, async () => {
          try {
            if (!ctx.from || !decodedData.blacklist) {
              throw new Error("User information is missing");
            }

            await ctx.reply("Adding...");
            let blacklistModel = await DarkWordModel.findOne({
              user: ctx.from.id,
            });

            if (!blacklistModel) {
              blacklistModel = await createNewDarkWordCollection(ctx.from.id);
            }

            blacklistModel.darkWords = [
              ...new Set([
                ...blacklistModel.darkWords,
                ...decodedData.blacklist.slice(),
              ]),
            ];

            await blacklistModel.save();

            keyboard.reply_markup.inline_keyboard[0] =
              keyboard.reply_markup.inline_keyboard[0].filter(
                (item) => item.callback_data !== btn.callback_data
              );

            await ctx.reply("Blacklist added.");
            await ctx.reply("Settings:", keyboard);
          } catch (err) {
            handleError(ctx, err);
          }
        });
      });
    }

    if (decodedData.channels?.length !== 0) {
      const btn: IKeyboardButton = {
        text: "Channels",
        callback_data: (botActions.importChannels +
          ctx.from?.id) as IKeyboardButton["callback_data"],
      };

      if (keyboard.reply_markup.inline_keyboard.length === 1) {
        keyboard.reply_markup.inline_keyboard.unshift([btn]);
      } else {
        keyboard.reply_markup.inline_keyboard[0].push(btn);
      }

      bot.action(btn.callback_data, async () => {
        const callbackData = {
          replace: btn.callback_data + "_replace",
          add: btn.callback_data + "_add",
          importedSettings:
            botActions.importSettings + ctx.from?.id + "imported",
        };

        await ctx.reply(`Replace or add channels?`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Replace",
                  callback_data: callbackData.replace,
                },
                {
                  text: "Add",
                  callback_data: callbackData.add,
                },
              ],
              [
                {
                  text: "Back",
                  callback_data: callbackData.importedSettings,
                },
              ],
            ],
          },
        });

        bot.action(callbackData.importedSettings, async () => {
          await ctx.reply("Settings:", keyboard);
        });

        bot.action(callbackData.replace, async () => {
          try {
            if (!ctx.from || !decodedData.channels) {
              throw new Error("User information is missing");
            }

            await ctx.reply("Replacing...");
            let channelsModel = await ChannelModel.find({ users: ctx.from.id });

            for await (const channel of channelsModel) {
              channel.users = channel.users.filter(
                (user) => user !== ctx.from!.id
              );

              if (channel.users.length === 0) {
                await channel.deleteOne();
              } else {
                await channel.save();
              }
            }
            try {
              for await (const channel of decodedData.channels) {
                const channelModel = await ChannelModel.findOne({
                  channelId: channel.channelId,
                });
                const username = await getChannelUsername(
                  channel.channelId,
                  channel.accessHash
                );
                const resolvedChannel = await resolveChannel(username.slice(1));

                if (channelModel) {
                  channelModel.users.push(ctx.from.id);
                  await channelModel.save();
                } else if (await checkIfJoined(resolvedChannel)) {
                  await ctx.reply(
                    `The channel ${username} is not included into folder (unavailable for now)`
                  );
                } else {
                  await addNewChannel(resolvedChannel, username, ctx);
                }
              }
            } catch (err) {
              console.log(err);
            }

            keyboard.reply_markup.inline_keyboard[0] =
              keyboard.reply_markup.inline_keyboard[0].filter(
                (item) => item.callback_data !== btn.callback_data
              );

            await ctx.reply("Channels replaced.");
            await ctx.reply("Settings:", keyboard);
          } catch (err) {
            handleError(ctx, err);
          }
        });

        bot.action(callbackData.add, async () => {
          try {
            if (!ctx.from || !decodedData.channels) {
              throw new Error("User information is missing");
            }

            await ctx.reply("Adding...");
            try {
              for await (const channel of decodedData.channels) {
                const channelModel = await ChannelModel.findOne({
                  channelId: channel.channelId,
                });

                const username = await getChannelUsername(
                  channel.channelId,
                  channel.accessHash
                );
                const resolvedChannel = await resolveChannel(username.slice(1));

                if (channelModel) {
                  channelModel.users.push(ctx.from.id);
                  await channelModel.save();
                } else if (await checkIfJoined(resolvedChannel)) {
                  await ctx.reply(
                    `The channel ${username} is not included into folder (unavailable for now)`
                  );
                } else {
                  await addNewChannel(resolvedChannel, username, ctx);
                }
              }
            } catch (err) {
              console.log(err);
            }

            keyboard.reply_markup.inline_keyboard[0] =
              keyboard.reply_markup.inline_keyboard[0].filter(
                (item) => item.callback_data !== btn.callback_data
              );

            await ctx.reply("Channels added.");
            await ctx.reply("Settings:", keyboard);
          } catch (err) {
            handleError(ctx, err);
          }
        });
      });
    }

    if (decodedData.profiles && decodedData.profiles.length > 0) {
      const btn: IKeyboardButton = {
        text: "Profiles",
        callback_data: (botActions.importProfiles +
          ctx.from?.id) as IKeyboardButton["callback_data"],
      };

      keyboard.reply_markup.inline_keyboard.unshift([btn]);

      bot.action(btn.callback_data, async () => {
        const callbackData = {
          replace: btn.callback_data + "_replace",
          add: btn.callback_data + "_add",
          importedSettings:
            botActions.importSettings + ctx.from?.id + "imported",
        };

        await ctx.reply(`Replace or add profiles?`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Replace",
                  callback_data: callbackData.replace,
                },
                {
                  text: "Add",
                  callback_data: callbackData.add,
                },
              ],
              [
                {
                  text: "Back",
                  callback_data: callbackData.importedSettings,
                },
              ],
            ],
          },
        });

        bot.action(callbackData.importedSettings, async () => {
          await ctx.reply("Settings:", keyboard);
        });

        bot.action(callbackData.replace, async () => {
          try {
            if (!ctx.from) {
              throw new Error("User information is missing");
            }

            await ctx.reply("Replacing...");
            let profileModel = await ProfileModel.findOne({
              user: ctx.from.id,
            });

            if (!profileModel) {
              profileModel = new ProfileModel({
                user: ctx.from.id,
              });
            }

            profileModel.profiles = profileModel.profiles.slice();

            await profileModel.save();

            keyboard.reply_markup.inline_keyboard[0] =
              keyboard.reply_markup.inline_keyboard[0].filter(
                (item) => item.callback_data !== btn.callback_data
              );

            await ctx.reply("Profiles replaced.");
            await ctx.reply("Settings:", keyboard);
          } catch (err) {
            handleError(ctx, err);
          }
        });

        bot.action(callbackData.add, async () => {
          try {
            if (!ctx.from) {
              throw new Error("User information is missing");
            }

            await ctx.reply("Adding...");
            let profileModel = await ProfileModel.findOne({
              user: ctx.from.id,
            });

            if (!profileModel) {
              profileModel = new ProfileModel({
                user: ctx.from.id,
              });
            }

            profileModel.profiles = [
              ...profileModel.profiles,
              ...(decodedData.profiles?.filter(
                (item) =>
                  !profileModel.profiles.some(
                    (profile) => profile.title === item.title
                  )
              ) || []),
            ];

            await profileModel.save();

            keyboard.reply_markup.inline_keyboard[0] =
              keyboard.reply_markup.inline_keyboard[0].filter(
                (item) => item.callback_data !== btn.callback_data
              );

            await ctx.reply("Profiles added.");
            await ctx.reply("Settings:", keyboard);
          } catch (err) {
            handleError(ctx, err);
          }
        });
      });
    }

    await ctx.reply("What to import?", keyboard);
  } catch (err) {
    handleError(ctx, err);
  }
};

const handleAddProfile = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    userStates.delete(ctx.from.id);

    const message =
      ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";

    const profileModel =
      (await ProfileModel.findOne({ user: ctx.from.id })) ||
      new ProfileModel({
        user: ctx.from.id,
      });

    if (profileModel.profiles.some((profile) => profile.title === message)) {
      await ctx.reply(`"${message}" profile already exists.`);
      await showMenu(ctx);
      return;
    }

    profileModel.profiles.push({
      title: message,
    });

    await profileModel.save();

    await ctx.reply(`"${message}" profile added.`);
    await showMenu(ctx);
  } catch (err) {
    handleError(ctx, err);
  }
};

const handleAddProfileWhitelist = async (
  ctx: Context<Update>,
  profile: IProfileItemSchema["title"]
) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const message =
      ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";

    const profileModel = await ProfileModel.findOne({ user: ctx.from.id });

    const profileItemModel = profileModel?.profiles.find(
      (item) => item.title === profile
    );

    if (profileModel && profileItemModel) {
      if (profileItemModel.whitelist?.includes(message)) {
        await ctx.reply(`"${message}" already exists in "${profile}" profile.`);
        return;
      }

      profileItemModel.whitelist?.push(message);
      await profileModel.save();
      await ctx.reply(`"${message}" added to "${profile}" profile.`);
    }
  } catch (err) {
    handleError(ctx, err);
  }
};

const handleAddProfileBlacklist = async (
  ctx: Context<Update>,
  profile: IProfileItemSchema["title"]
) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const message =
      ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";

    const profileModel = await ProfileModel.findOne({ user: ctx.from.id });

    const profileItemModel = profileModel?.profiles.find(
      (item) => item.title === profile
    );

    if (profileModel && profileItemModel) {
      if (profileItemModel.blacklist?.includes(message)) {
        await ctx.reply(`"${message}" already exists in "${profile}" profile.`);
        return;
      }

      profileItemModel.blacklist?.push(message);
      await profileModel.save();
      await ctx.reply(`"${message}" added to "${profile}" profile.`);
    }
  } catch (err) {
    handleError(ctx, err);
  }
};

// ------------------------------------------------------------------------

export const botStart = async (ctx: Context<Update>) => {
  try {
    await showMenu(ctx);
  } catch (err) {
    ctx.reply("An error occurred while starting the bot.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Restart bot", callback_data: "restart_bot" }],
        ],
      },
    });
  }
};

export const botSettings = async (ctx: Context<Update>) => {
  await ctx.reply("Settings:", settingsKeyboard);
};

export const botCancel = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    if (userStates.has(ctx.from.id)) {
      const state = userStates.get(ctx.from.id);
      if (typeof state === "object" && "showMenu" in state) {
        if (state.showMenu) {
          await state.showMenu();
        } else {
          await showMenu(ctx);
        }
        userStates.delete(ctx.from.id);
      } else {
        userStates.delete(ctx.from.id);
        await showMenu(ctx);
      }
    } else {
      await ctx.reply("You have no active operations to cancel.");
      await showMenu(ctx);
    }
  } catch (err) {
    handleError(ctx, err);
  }
};

export const botText = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const user = ctx.from.id;
    const state = userStates.get(user);

    if (state === botActions.addChannel) {
      await handleAddChannel(ctx);
    } else if (state === botActions.addWord) {
      await handleAddWord(ctx);
    } else if (state === botActions.addDarkWord) {
      await handleAddDarkWord(ctx);
    } else if (state === botActions.importSettings) {
      await handleImportSettings(ctx);
    } else if (state === botActions.addProfile) {
      await handleAddProfile(ctx);
    } else if (state?.type === botActions.addProfileWhitelist) {
      await handleAddProfileWhitelist(ctx, state.payload);
    } else if (state?.type === botActions.addProfileBlacklist) {
      await handleAddProfileBlacklist(ctx, state.payload);
    } else {
      await showMenu(ctx);
      userStates.delete(user);
    }
  } catch (err) {
    handleError(ctx, err);
  }
};

export const useAddUser = async (
  ctx: Context<Update>,
  next: () => Promise<void>
) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const userId = ctx.from.id;

    if (!users.has(userId)) {
      const user = await UserModel.findOne({ telegramId: userId });

      if (!user) {
        const newUserModel = await createNewUserCollection(ctx);
        users.set(userId, newUserModel);
      } else {
        users.set(userId, user);
      }
    }

    await next();
  } catch (err) {
    handleError(ctx, err);
  }
};
