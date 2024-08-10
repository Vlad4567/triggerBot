import { Context, Telegraf } from "telegraf";
import Channel from "../models/channelModels";
import { Update } from "telegraf/typings/core/types/typegram";
import botActions from "../commands/botActions";
import { userStates } from "..";
import { startKeyboard } from "../commands/botKeyboards";
import { client } from "../services/user";
import { Api } from "telegram";
import bigInt from "big-integer";
import logger from "../utils/func/logger";
import { writeFileSync } from "fs";
import userConfig from "../config/user";

const CANCEL_COMMAND = "cancel";

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

      bot.command(CANCEL_COMMAND, async (ctx) => {
        bot.command(CANCEL_COMMAND, () => {});

        bot.on("text", () => {});

        userStates.delete(ctx.from.id);
        ctx.reply("Choose your option", startKeyboard);
      });

      bot.on("text", async (ctx) => {
        const userId = ctx.from.id;
        const state = userStates.get(userId);

        if (state === botActions.addChannel) {
          const link = ctx.message?.text.trim();
          const channelLink = link.startsWith("@")
            ? link.slice(1)
            : link.split("/").slice(-1)[0];
          const channel = await client.invoke(
            new Api.contacts.ResolveUsername({
              username: channelLink,
            })
          );
          const isJoined = (
            (await client.invoke(
              new Api.messages.GetDialogs({
                offsetDate: 0,
                offsetId: 0,
                offsetPeer: new Api.InputPeerEmpty(),
                limit: 2147483647,
                hash: bigInt(0),
              })
            )) as any
          ).chats.some((chat: any) => `${chat.id}` === `${channel.chats[0].id}`);
          // const isChannelIncludedIntoFolder = folder.includePeers.some((peer: any) => peer.channelId === channel.chats[0].id)
          const channelDB = await Channel.findOne({
            channelId: channel.chats[0].id,
          });

          if (channelDB?.userIds.includes(ctx.from.id)) {
            await ctx.reply("Channel already exists");
          } else if (channelDB) {
            channelDB.userIds.push(ctx.from.id);
            await channelDB.save();
            await ctx.reply(`Added: ${channelDB.channelName}`);
          } else if (isJoined) {
            await ctx.reply(
              "This channel is not included into folder (unavailable for now)"
            );
          } else if (!isJoined) {
            await client.invoke(
              new Api.channels.JoinChannel({ channel: link })
            );
            const joinedChannel = (
              (await client.invoke(
                new Api.messages.GetDialogs({
                  offsetDate: 0,
                  offsetId: 0,
                  offsetPeer: new Api.InputPeerEmpty(),
                  limit: 2147483647,
                  hash: bigInt(0),
                })
              )) as any
            ).chats.find(
              (chat: any) => `${chat.id}` === `${channel.chats[0].id}`
            );
            const newChannel = new Channel({
              channelName: (channel.chats[0] as any).title,
              channelId: channel.chats[0].id,
              accessHash: joinedChannel.accessHash,
              link: channelLink,
              userIds: [ctx.from.id],
            });
            await newChannel.save();

            const folder = (
              await client.invoke(new Api.messages.GetDialogFilters())
            ).filters.find((f: any) => f.id === userConfig.folderId) as any;

            await client.invoke(
              new Api.messages.UpdateDialogFilter({
                id: userConfig.folderId,
                filter: new Api.DialogFilter({
                  id: userConfig.folderId,
                  title: "triggerBot",
                  pinnedPeers: [],
                  includePeers: [
                    ...folder.includePeers,
                    new Api.InputPeerChannel({
                      channelId: bigInt(newChannel.channelId),
                      accessHash: bigInt(newChannel.accessHash),
                    }),
                  ],
                  excludePeers: [],
                }),
              })
            );
            await client.invoke(
              new Api.folders.EditPeerFolders({
                folderPeers: [
                  new Api.InputFolderPeer({
                    peer: new Api.InputPeerChannel({
                      channelId: channel.chats[0].id, // The ID of the channel you want to archive
                      accessHash: joinedChannel.accessHash, // The access hash of the channel
                    }),
                    folderId: 1, // 1 represents the archive folder
                  }),
                ],
              }))

            await ctx.reply(`Added: ${newChannel.channelName}`);
          } else {
            ctx.reply("Error");
          }
          await replyProvideChannels();
        }
      });
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
                      "_delete",
                  },
                ]
              ),
            },
          });

          channels.forEach((channel) => {
            bot.action(
              channel.accessHash + channel.channelId + "_delete",
              async (ctx) => {
                channel.userIds = channel.userIds.filter(
                  (userId) => userId !== ctx.from.id
                );
                if (channel.userIds.length === 0) {
                  await Channel.deleteOne({ channelId: channel.channelId });
                  await client.invoke(
                    new Api.channels.LeaveChannel({
                      channel: new Api.InputPeerChannel({
                          channelId: bigInt(channel.channelId),
                          accessHash: bigInt(channel.accessHash),
                      }),
                  })
                  );
                } else {
                  await channel.save();
                }

                channels = await Channel.find({ userId: ctx.from.id });
                await ctx.reply("Channel deleted.", {
                  reply_markup: {
                    keyboard: [[{ text: "/start" }]],
                  },
                });
                bot.action(
                  channel.accessHash + channel.channelId + "_delete",
                  () => {}
                );

                if (channels.length !== 0) {
                  await generateKeyboard();
                } else {
                  await ctx.reply("No channels to delete.");
                  await ctx.reply("Choose your option", startKeyboard);
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
