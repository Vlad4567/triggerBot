import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { userStates } from "../..";
import botActions from "../../commands/botActions";
import { CANCEL_COMMAND } from "../../commands/botKeyboards";
import { handleError } from "../../middlewares/errorHandler";
import ProfileModel from "../../models/profile.model";
import { showMenu } from "../../utils/functions/bot/context";
import { bot } from "../../services/bot";

export const addProfile = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    userStates.set(ctx.from.id, botActions.addProfile);

    await ctx.reply(
      `Please provide profie name or type "${CANCEL_COMMAND}" to cancel`,
      {
        reply_markup: {
          keyboard: [[{ text: CANCEL_COMMAND }]],
        },
      }
    );
  } catch (err) {
    handleError(ctx, err);
  }
};

export const allProfiles = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const profileModel = await ProfileModel.findOne({ user: ctx.from.id });

    if (profileModel && profileModel.profiles.length > 0) {
      const getProfileCallbackData = (title: string) =>
        botActions.allProfiles + ctx.from?.id + title;

      await ctx.reply(`You have ${profileModel.profiles.length} profiles:`, {
        reply_markup: {
          inline_keyboard: Array.from(
            { length: Math.ceil(profileModel.profiles.length / 2) },
            (_, i) =>
              profileModel?.profiles.slice(i * 2, i * 2 + 2).map((profile) => ({
                text: `${profile.isActive ? "🟢" : "🔴"}${profile.title}`,
                callback_data: getProfileCallbackData(profile.title),
              })) || []
          ),
        },
      });

      profileModel.profiles.forEach((profile) => {
        const callbackData = {
          toggleStatus:
            botActions.allProfiles +
            profile.isActive +
            ctx.from?.id +
            profile.title,
          removeWhitelist:
            botActions.deleteWords +
            botActions.allProfiles +
            ctx.from?.id +
            profile.title,
          allWhitelist:
            botActions.wordList +
            botActions.allProfiles +
            ctx.from?.id +
            profile.title,
          addWhitelist:
            botActions.addProfileWhitelist + ctx.from?.id + profile.title,
          addBlacklist:
            botActions.addProfileBlacklist + ctx.from?.id + profile.title,
          allBlacklist:
            botActions.darkWordList +
            botActions.allProfiles +
            ctx.from?.id +
            profile.title,
          removeBlacklist:
            botActions.deleteDarkWords +
            botActions.allProfiles +
            ctx.from?.id +
            profile.title,
          deleteProfile:
            botActions.allProfiles + ctx.from?.id + "delete" + profile.title,
          cancel:
            botActions.allProfiles + ctx.from?.id + "cancel" + profile.title,
        };

        bot.action(getProfileCallbackData(profile.title), async () => {
          const showProfileMenu = async () => {
            return await ctx.reply(
              `${profile.isActive ? "🟢" : "🔴"}Rent profile: ${profile.title}`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: profile.isActive ? "[🔴Turn off]" : "[🟢Turn on]",
                        callback_data: callbackData.toggleStatus,
                      },
                    ],
                    [
                      {
                        text: "+ Whitelist",
                        callback_data: callbackData.addWhitelist,
                      },
                      {
                        text: "all Whitelist",
                        callback_data: callbackData.allWhitelist,
                      },
                      {
                        text: "- Whitelist",
                        callback_data: callbackData.removeWhitelist,
                      },
                    ],
                    [
                      {
                        text: "+ Blacklist",
                        callback_data: callbackData.addBlacklist,
                      },
                      {
                        text: "all Blacklist",
                        callback_data: callbackData.allBlacklist,
                      },
                      {
                        text: "- Blacklist",
                        callback_data: callbackData.removeBlacklist,
                      },
                    ],
                    [
                      {
                        text: "Delete profile",
                        callback_data: callbackData.deleteProfile,
                      },
                    ],
                  ],
                },
              }
            );
          };

          await showProfileMenu();

          bot.action(callbackData.toggleStatus, async () => {
            const updatedProfileModel = await ProfileModel.findOne({
              user: ctx.from?.id,
            });

            const updatedProfileItemModel = updatedProfileModel?.profiles.find(
              (item) => item.title === profile.title
            );

            if (updatedProfileItemModel) {
              updatedProfileItemModel.isActive =
                !updatedProfileItemModel.isActive;
              await updatedProfileModel?.save();
              profile.isActive = updatedProfileItemModel.isActive;
            }
            await showProfileMenu();
          });

          bot.action(callbackData.addWhitelist, async () => {
            await ctx.reply(
              `Please provide words one by one or type "${CANCEL_COMMAND}" to cancel`,
              {
                reply_markup: {
                  keyboard: [[{ text: CANCEL_COMMAND }]],
                },
              }
            );

            if (ctx.from) {
              userStates.set(ctx.from.id, {
                type: botActions.addProfileWhitelist,
                payload: profile.title,
                showMenu: showProfileMenu,
              });
            }
          });

          bot.action(callbackData.allWhitelist, async () => {
            const updatedProfileModel = await ProfileModel.findOne({
              user: ctx.from?.id,
            });
            const updatedProfileItemModel = updatedProfileModel?.profiles.find(
              (item) => item.title === profile.title
            );

            if (
              updatedProfileItemModel &&
              updatedProfileItemModel.whitelist &&
              updatedProfileItemModel.whitelist.length > 0
            ) {
              const wordList = updatedProfileItemModel.whitelist.join(", ");
              await ctx.reply(`Words: ${wordList}`);
            } else {
              await ctx.reply("No words found.");
            }
            await showProfileMenu();
          });

          bot.action(callbackData.removeWhitelist, async () => {
            const updatedProfileModel = await ProfileModel.findOne({
              user: ctx.from?.id,
            });
            const updatedProfileItemModel = updatedProfileModel?.profiles.find(
              (item) => item.title === profile.title
            );

            if (
              !updatedProfileItemModel?.whitelist ||
              updatedProfileItemModel.whitelist.length === 0
            ) {
              await ctx.reply("No words to delete.");
              await showProfileMenu();
              return;
            }

            const getCallbackData = (word: string) =>
              callbackData.removeWhitelist + word;

            const createMatrix = (
              words: typeof updatedProfileItemModel.whitelist,
              columns = 8
            ) => {
              const result = words.reduce((matrix, word, index) => {
                const row = Math.floor(index / columns);
                if (!matrix[row]) matrix[row] = [];
                matrix[row].push({
                  text: word,
                  callback_data: getCallbackData(word),
                });
                return matrix;
              }, [] as Array<Array<{ text: string; callback_data: string }>>);

              result.push([
                { text: "Cancel", callback_data: callbackData.cancel },
              ]);

              return result;
            };

            const generateKeyboard = async (
              collection: typeof updatedProfileItemModel.whitelist
            ) => {
              await ctx.reply("Choose a word to delete:", {
                reply_markup: {
                  inline_keyboard: createMatrix(collection),
                },
              });

              collection.forEach((word, j) => {
                bot.action(getCallbackData(word), async () => {
                  const updatedCollection = await ProfileModel.findOne({
                    user: ctx.from?.id,
                  });
                  const updatedProfile = updatedCollection?.profiles.find(
                    (item) => item.title === profile.title
                  );

                  if (updatedProfile) {
                    updatedProfile.whitelist =
                      updatedProfile?.whitelist?.filter(
                        (item) => item !== word
                      );
                    await updatedCollection?.save();
                  }

                  if (
                    !updatedProfile ||
                    updatedProfile.whitelist?.length === 0
                  ) {
                    await ctx.reply("No words left.");
                    await showProfileMenu();
                  } else if (updatedProfile.whitelist) {
                    generateKeyboard(updatedProfile.whitelist);
                  } else {
                    await showProfileMenu();
                  }
                });
              });
            };

            await generateKeyboard(updatedProfileItemModel.whitelist);
          });

          bot.action(callbackData.addBlacklist, async () => {
            await ctx.reply(
              `Please provide words one by one or type "${CANCEL_COMMAND}" to cancel`,
              {
                reply_markup: {
                  keyboard: [[{ text: CANCEL_COMMAND }]],
                },
              }
            );

            if (ctx.from) {
              userStates.set(ctx.from.id, {
                type: botActions.addProfileBlacklist,
                payload: profile.title,
                showMenu: showProfileMenu,
              });
            }
          });

          bot.action(callbackData.allBlacklist, async () => {
            const updatedProfileModel = await ProfileModel.findOne({
              user: ctx.from?.id,
            });
            const updatedProfileItemModel = updatedProfileModel?.profiles.find(
              (item) => item.title === profile.title
            );

            if (
              updatedProfileItemModel?.blacklist &&
              updatedProfileItemModel.blacklist.length > 0
            ) {
              const wordList = updatedProfileItemModel.blacklist.join(", ");
              await ctx.reply(`Words: ${wordList}`);
            } else {
              await ctx.reply("No words found.");
            }
            await showProfileMenu();
          });

          bot.action(callbackData.removeBlacklist, async () => {
            const updatedProfileModel = await ProfileModel.findOne({
              user: ctx.from?.id,
            });
            const updatedProfileItemModel = updatedProfileModel?.profiles.find(
              (item) => item.title === profile.title
            );

            if (
              !updatedProfileItemModel?.blacklist ||
              updatedProfileItemModel.blacklist.length === 0
            ) {
              await ctx.reply("No words to delete.");
              await showProfileMenu();
              return;
            }

            const getCallbackData = (word: string) =>
              callbackData.removeBlacklist + word;

            const createMatrix = (
              words: typeof updatedProfileItemModel.blacklist,
              columns = 8
            ) => {
              const result = words.reduce((matrix, word, index) => {
                const row = Math.floor(index / columns);
                if (!matrix[row]) matrix[row] = [];
                matrix[row].push({
                  text: word,
                  callback_data: getCallbackData(word),
                });
                return matrix;
              }, [] as Array<Array<{ text: string; callback_data: string }>>);

              result.push([
                { text: "Cancel", callback_data: callbackData.cancel },
              ]);

              return result;
            };

            const generateKeyboard = async (
              collection: typeof updatedProfileItemModel.blacklist
            ) => {
              await ctx.reply("Choose a word to delete:", {
                reply_markup: {
                  inline_keyboard: createMatrix(collection),
                },
              });

              collection.forEach((word, j) => {
                bot.action(getCallbackData(word), async () => {
                  const updatedCollection = await ProfileModel.findOne({
                    user: ctx.from?.id,
                  });
                  const updatedProfile = updatedCollection?.profiles.find(
                    (item) => item.title === profile.title
                  );

                  if (updatedProfile) {
                    updatedProfile.blacklist = updatedProfile.blacklist?.filter(
                      (item) => item !== word
                    );
                    await updatedCollection?.save();
                  }

                  if (
                    !updatedProfile ||
                    updatedProfile.blacklist?.length === 0
                  ) {
                    await ctx.reply("No words left.");
                    await showProfileMenu();
                  } else if (updatedProfile.blacklist) {
                    generateKeyboard(updatedProfile.blacklist);
                  } else {
                    await showProfileMenu();
                  }
                });
              });
            };

            await generateKeyboard(updatedProfileItemModel.blacklist);
          });

          bot.action(callbackData.cancel, async () => {
            if (ctx.from) {
              userStates.delete(ctx.from.id);
            }
            await showProfileMenu();
          });

          bot.action(callbackData.deleteProfile, async () => {
            const callbackDataConfirmation =
              callbackData.deleteProfile + "confirm";

            await ctx.reply("Are you sure you want to delete this profile?", {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Yes",
                      callback_data: callbackDataConfirmation,
                    },
                    {
                      text: "No",
                      callback_data: callbackData.cancel,
                    },
                  ],
                ],
              },
            });

            bot.action(callbackDataConfirmation, async () => {
              const updatedProfileModel = await ProfileModel.findOne({
                user: ctx.from?.id,
              });

              if (updatedProfileModel) {
                updatedProfileModel.profiles =
                  updatedProfileModel.profiles.filter(
                    (item) => item.title !== profile.title
                  );
                await updatedProfileModel.save();
              }

              await ctx.reply("Profile deleted.");
              await showMenu(ctx);
            });
          });
        });
      });
    } else {
      await ctx.reply("You don't have any profiles yet.");
      await showMenu(ctx);
    }
  } catch (err) {
    handleError(ctx, err);
  }
};
