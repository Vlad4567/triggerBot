import { Api, errors } from "telegram";
import bigInt from "big-integer";
import { client } from "../../../services/user";
import mongoose, { Document } from "mongoose";
import { IChannelSchema } from "../../../models/channelModel";
import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import ChannelModel from "../../../models/channelModel";
import userConfig from "../../../configs/user";
import { handleError } from "../../../middlewares/errorHandler";

export const resolveChannel = async (channelLink: string) => {
  return await client.invoke(
    new Api.contacts.ResolveUsername({
      username: channelLink,
    })
  );
};

export const getChannelUsername = async (
  channelId: string,
  accessHash: string
): Promise<string> => {
  const result = await client.invoke(
    new Api.channels.GetChannels({
      id: [
        new Api.InputPeerChannel({
          channelId: bigInt(channelId),
          accessHash: bigInt(accessHash),
        }),
      ],
    })
  );

  if (result.chats && result.chats.length > 0 && !!(await ChannelModel.findOne({channelId}))) {
    const channel = result.chats[0] as Api.Channel;
    return '@' + channel.username || "";
  }

  throw new Error(`Channel ${channelId} not found`);
};

export const checkIfJoined = async (
  channel: Api.contacts.ResolvedPeer
): Promise<boolean> => {
  const dialogs = (await client.invoke(
    new Api.messages.GetDialogs({
      offsetDate: 0,
      offsetId: 0,
      offsetPeer: new Api.InputPeerEmpty(),
      limit: 2147483647,
      hash: bigInt(0),
    })
  )) as any;

  return dialogs.chats.some(
    (chat: any) => `${chat.id}` === `${channel.chats[0].id}`
  );
};

export const addUserToExistingChannel = async (
  channelDB: Document<unknown, {}, IChannelSchema> &
    IChannelSchema & {
      _id: mongoose.Types.ObjectId;
    },
  ctx: Context<Update>
) => {
  channelDB.users.push(ctx.from!.id);
  await channelDB.save();
  await ctx.reply(`Added: ${channelDB.channelName}`);
};

export const addNewChannel = async (
  channel: Api.contacts.ResolvedPeer,
  link: string,
  ctx: Context<Update>
) => {
  try {
    await client.invoke(new Api.channels.JoinChannel({ channel: link }));
  } catch (err: any) {
    if (err instanceof errors.FloodWaitError) {
      const waitSeconds = err.seconds;
      scheduleAddingTheChannel(
        ctx,
        waitSeconds * 1000 + 2000,
        waitSeconds,
        channel,
        link
      );

      return;
    } else {
      throw err;
    }
  }
  const joinedChannel = await getJoinedChannel(channel);
  await client.invoke(
    new Api.messages.GetDialogs({
      offsetDate: 0,
      offsetId: 0,
      offsetPeer: new Api.InputPeerEmpty(),
      limit: 100,
      hash: bigInt(0),
    })
  );
  if (!joinedChannel?.accessHash) {
    try {
      await client.invoke(
        new Api.channels.LeaveChannel({
          channel: new Api.InputChannel({
            channelId: channel.chats[0].id,
            accessHash: (channel.chats[0] as any).accessHash,
          }),
        })
      );
    } catch (err) {
      if (
        err instanceof errors.RPCError &&
        err.errorMessage === "USER_NOT_PARTICIPANT"
      ) {
      } else {
        throw err;
      }
    }
    throw new Error("This channel doesn't have information to join");
  }
  const newChannel = await createNewChannelCollection(
    channel,
    joinedChannel,
    ctx
  );
  await updateDialogFilter(newChannel);
  await ctx.reply(`Added: ${newChannel.channelName}`);
};

export const scheduleAddingTheChannel = async (
  ctx: Context<Update>,
  time: number,
  waitSeconds: number,
  channel: Api.contacts.ResolvedPeer,
  link: string
) => {
  const addTime = new Date(Date.now() + time);
  await ctx.reply(
    `Channel by link ${link} will be tried to added automatically after ${waitSeconds} seconds (at ${addTime.toLocaleTimeString()}). Please wait.`
  );

  // Schedule the channel addition
  setTimeout(async () => {
    try {
      try {
        await client.invoke(new Api.channels.JoinChannel({ channel: link }));
      } catch (err: any) {
        if (err instanceof errors.FloodWaitError) {
          const waitSeconds = err.seconds;
          scheduleAddingTheChannel(ctx, time, waitSeconds, channel, link);

          return;
        } else {
          throw err;
        }
      }
      const joinedChannel = await getJoinedChannel(channel);
      if (joinedChannel?.accessHash) {
        const newChannel = await createNewChannelCollection(
          channel,
          joinedChannel,
          ctx
        );
        await updateDialogFilter(newChannel);
        await ctx.reply(`Added: ${newChannel.channelName}`);
      } else {
        await ctx.reply(
          "Failed to add the channel. Please try again manually."
        );
      }
    } catch (error) {
      handleError(ctx, error);
    }
  }, time);
};

export const getJoinedChannel = async (
  channel: Api.contacts.ResolvedPeer
): Promise<
  Document<unknown, {}, IChannelSchema> &
    IChannelSchema & {
      _id: mongoose.Types.ObjectId;
    }
> => {
  const dialogs = (await client.invoke(
    new Api.messages.GetDialogs({
      offsetDate: 0,
      offsetId: 0,
      offsetPeer: new Api.InputPeerEmpty(),
      limit: 2147483647,
      hash: bigInt(0),
    })
  )) as any;

  return dialogs.chats.find(
    (chat: any) => `${chat.id}` === `${channel.chats[0].id}`
  );
};

export const createNewChannelCollection = async (
  channel: Api.contacts.ResolvedPeer,
  joinedChannel: Document<unknown, {}, IChannelSchema> &
    IChannelSchema & {
      _id: mongoose.Types.ObjectId;
    },
  ctx: Context<Update>
) => {
  const newChannel = new ChannelModel({
    channelName: (channel.chats[0] as any).title,
    channelId: channel.chats[0].id,
    accessHash: joinedChannel.accessHash,
    users: [ctx.from!.id],
  });
  await newChannel.save();
  return newChannel;
};

export const updateDialogFilter = async (
  newChannel: Document<unknown, {}, IChannelSchema> &
    IChannelSchema & {
      _id: mongoose.Types.ObjectId;
    }
) => {
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
};

export const removeUserFromChannel = async (
  channelDB: Document<unknown, {}, IChannelSchema> &
    IChannelSchema & {
      _id: mongoose.Types.ObjectId;
    },
  ctx: Context<Update>
) => {
  if (!ctx.from) {
    throw new Error("User information is missing");
  }

  channelDB.users = channelDB.users.filter((user) => user !== ctx.from!.id);

  if (channelDB.users.length === 0) {
    await ChannelModel.deleteOne({
      channelId: channelDB.channelId,
    });
    await client.invoke(
      new Api.channels.LeaveChannel({
        channel: new Api.InputPeerChannel({
          channelId: bigInt(channelDB.channelId),
          accessHash: bigInt(channelDB.accessHash),
        }),
      })
    );
  } else {
    await channelDB.save();
  }

  await ctx.reply(`Removed: ${channelDB.channelName}`);
};
