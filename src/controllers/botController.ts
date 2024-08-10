import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { startKeyboard } from "../commands/botKeyboards";
import { userStates } from "..";
import botActions from "../commands/botActions";
import { Api } from "telegram";
import { client } from "../services/user";
import bigInt from "big-integer";
import Channel from "../models/channelModels";
import Word from "../models/wordModels";
import userConfig from "../config/user";
import { CANCEL_COMMAND } from "../utils/commands";

export default (bot: Telegraf<Context<Update>>) => {
  bot.command("start", async (ctx) => {
    try {
      ctx.reply("Choose your option", startKeyboard);
    } catch (err) {
      ctx.reply("An error occurred while starting the bot.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Restart bot", callback_data: "restart_bot" }],
          ],
        },
      });
    }
  });

  bot.command(CANCEL_COMMAND, async (ctx) => {
    userStates.delete(ctx.from.id);
    ctx.reply("Choose your option", startKeyboard);
  });

  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    const state = userStates.get(userId);

    if (state === botActions.addChannel) {
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

      const link = ctx.message?.text.trim();
      const channelLink = link.startsWith("@")
        ? link.slice(1)
        : link.split("/").slice(-1)[0];
      let channel: Api.contacts.ResolvedPeer;
      try {
        channel = await client.invoke(
          new Api.contacts.ResolveUsername({
            username: channelLink,
          })
        );
      } catch {
        await ctx.reply("Channel not found");
        return;
      }
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
      const channelDB = await Channel.findOne({
        channelId: channel.chats[0].id,
      });

      if (channelDB?.userIds.includes(ctx.from.id)) {
        await ctx.reply("You have already added this channel");
      } else if (channelDB) {
        channelDB.userIds.push(ctx.from.id);
        await channelDB.save();
        await ctx.reply(`Added: ${channelDB.channelName}`);
      } else if (isJoined) {
        await ctx.reply(
          "This channel is not included into folder (unavailable for now)"
        );
      } else {
        await client.invoke(new Api.channels.JoinChannel({ channel: link }));
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
        ).chats.find((chat: any) => `${chat.id}` === `${channel.chats[0].id}`);
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
                  channelId: channel.chats[0].id,
                  accessHash: joinedChannel.accessHash,
                }),
                folderId: 1,
              }),
            ],
          })
        );

        await ctx.reply(`Added: ${newChannel.channelName}`);
      }
      await replyProvideChannels();
    }

    if (state === botActions.addWord) {
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
      const word = ctx.message?.text;
      const hasDuplicate = await Word.findOne({ word, userId });

      if (!hasDuplicate) {
        const newWord = new Word({
          word,
          userId,
          username: `${ctx.from.first_name} ${ctx.from.last_name} ${ctx.from.username}`,
        });
        await newWord.save();

        await ctx.reply("Word received: " + word);
        replyProvideWords();
      } else {
        await ctx.reply("Word already exists.");
        replyProvideWords();
      }
    }
  });
};
