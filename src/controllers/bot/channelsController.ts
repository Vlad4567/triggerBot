import { Context, Telegraf } from "telegraf";
import ChannelModel from "../../models/channelModel";
import { Update } from "telegraf/typings/core/types/typegram";
import botActions from "../../commands/botActions";
import { userStates } from "../..";
import { startKeyboard } from "../../commands/botKeyboards";
import { CANCEL_COMMAND } from "../../commands/botKeyboards";
import { handleError } from "../../middlewares/errorHandler";
import { removeUserFromChannel } from "../../utils/functions/bot/channel";
import { showMenu } from "../../utils/functions/bot/context";

export const addChannel = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    userStates.set(ctx.from.id, botActions.addChannel);

    const replyProvideChannels = async () => {
      await ctx.reply(
        `Please provide channels one by one in one of the following ways to add: "https://t.me/UkraineThai1", "@UkraineThai1" or type "${CANCEL_COMMAND}" to cancel`,
        {
          reply_markup: {
            keyboard: [[{ text: CANCEL_COMMAND }]],
          },
        }
      );
    };

    await replyProvideChannels();
  } catch (err) {
    handleError(ctx, err);
  }
};

export const channelList = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const channels = await ChannelModel.find({ users: ctx.from.id });
    if (channels.length === 0) {
      await ctx.reply("You have no channels added yet", startKeyboard);
    } else {
      ctx.reply(
        `Channels: \n ${channels
          .map((channel, i) => `${i + 1} ${channel.channelName}`)
          .join("\n")}`,
        startKeyboard
      );
    }
  } catch (err) {
    handleError(ctx, err);
  }
};

export const deleteChannel = async (
  ctx: Context<Update>,
  bot: Telegraf<Context<Update>>
) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    let channels = await ChannelModel.find({ users: ctx.from.id });

    if (channels.length !== 0) {
      const generateKeyboard = async () => {
        await ctx.reply("Choose a channel to delete:", {
          reply_markup: {
            inline_keyboard: Array.from({ length: channels.length }, (_, i) => [
              {
                text: channels[i].channelName,
                callback_data:
                  channels[i].accessHash +
                  channels[i].channelId +
                  ctx.from?.id +
                  "_delete",
              },
            ]),
          },
        });

        channels.forEach((channel) => {
          bot.action(
            channel.accessHash + channel.channelId + ctx.from?.id + "_delete",
            async (ctxTwo) => {
              const channelToDelete = (await ChannelModel.findOne({
                users: ctx.from?.id,
                channelId: channel.channelId,
              }))!;
              await removeUserFromChannel(channelToDelete, ctxTwo);

              channels = await ChannelModel.find({ users: ctxTwo.from.id });
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
                await showMenu(ctxTwo)
              }
            }
          );
        });
      };

      await generateKeyboard();
    } else {
      await ctx.reply("No channels to delete.");
      await showMenu(ctx)
    }
  } catch (err) {
    handleError(ctx, err);
  }
};
