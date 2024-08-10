import { Context, Telegraf } from "telegraf";
import Channel from "../models/channelModels";
import { Update } from "telegraf/typings/core/types/typegram";
import botActions from "../commands/botActions";
import { userStates } from "..";
import { startKeyboard } from "../commands/botKeyboards";
import { client } from "../services/user";
import { Api } from "telegram";
import bigInt from "big-integer";
import { CANCEL_COMMAND } from "../utils/commands";

export default (bot: Telegraf<Context<Update>>) => {
  bot.action(botActions.addChannel, async (ctx) => {
    try {
      userStates.set(ctx.from.id, botActions.addChannel);

      const replyProvideChannels = async () => {
        await ctx.reply(
          `Please provide channels one by one in one of the following ways to add: "https://t.me/UkraineThai1", "@UkraineThai1" or type "/${CANCEL_COMMAND}" to cancel`,
          {
            reply_markup: {
              keyboard: [[{ text: `/${CANCEL_COMMAND}` }]],
            },
          }
        );
      };

      await replyProvideChannels();
    } catch (err) {
      ctx.reply("An error occurred while adding the channel.");
    }
  });

  bot.action(botActions.listOfChannels, async (ctx) => {
    try {
      const channels = await Channel.find({ userIds: ctx.from.id });
      ctx.reply(
        `Channels: \n ${channels
          .map((channel, i) => `${i + 1} ${channel.channelName}`)
          .join("\n")}`,
        startKeyboard
      );
    } catch (err) {
      ctx.reply("An error occurred while retrieving the channels.");
    }
  });

  bot.action(botActions.deleteChannel, async (ctx) => {
    try {
      let channels = await Channel.find({ userIds: ctx.from.id });

      if (channels.length !== 0) {
        const generateKeyboard = async () => {
          await ctx.reply("Choose a channel to delete:", {
            reply_markup: {
              inline_keyboard: Array.from(
                { length: channels.length },
                (_, i) => [
                  {
                    text: channels[i].channelName,
                    callback_data:
                      channels[i].accessHash +
                      channels[i].channelId +
                      ctx.from.id +
                      "_delete",
                  },
                ]
              ),
            },
          });

          channels.forEach((channel) => {
            bot.action(
              channel.accessHash + channel.channelId + ctx.from.id + "_delete",
              async (ctxTwo) => {
                const channelToDelete = (await Channel.findOne({ userIds: ctx.from.id, channelId: channel.channelId }))!;
                channelToDelete.userIds = channelToDelete.userIds.filter(
                  (userId) => userId !== ctxTwo.from.id
                );
                if (channelToDelete.userIds.length === 0) {
                  await Channel.deleteOne({ channelId: channelToDelete.channelId });
                  await client.invoke(
                    new Api.channels.LeaveChannel({
                      channel: new Api.InputPeerChannel({
                        channelId: bigInt(channelToDelete.channelId),
                        accessHash: bigInt(channelToDelete.accessHash),
                      }),
                    })
                  );
                } else {
                  await channelToDelete.save();
                }

                channels = await Channel.find({ userId: ctxTwo.from.id });
                await ctxTwo.reply("Channel deleted.", {
                  reply_markup: {
                    keyboard: [[{ text: "/start" }]],
                  },
                });
                bot.action(
                  channel.accessHash +
                    channel.channelId +
                    ctxTwo.from.id +
                    "_delete",
                  () => {}
                );

                if (channels.length !== 0) {
                  await generateKeyboard();
                } else {
                  await ctxTwo.reply("No channels to delete.");
                  await ctxTwo.reply("Choose your option", startKeyboard);
                }
              }
            );
          });
        };

        await generateKeyboard();
      } else {
        await ctx.reply("No channels to delete.");
        await ctx.reply("Choose your option", startKeyboard);
      }
    } catch (err) {
      ctx.reply("An error occurred while deleting the channel.");
    }
  });
};
