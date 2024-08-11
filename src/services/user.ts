import { NewMessage } from "telegram/events";
import { StringSession } from "telegram/sessions";
import userConfig from "../config/user";
import logger from "../utils/func/logger";
import { rl } from "..";
import { Api, TelegramClient } from "telegram";
import Channel from "../models/channelModels";
import Words from "../models/wordModels";
import { writeFileSync } from "fs";
import { bot } from "./bot";

const { apiId, apiHash } = userConfig;

const stringSession = new StringSession(userConfig.stringSession);

export const client = new TelegramClient(stringSession, +apiId, apiHash, {
  connectionRetries: 5,
});

async function getFolderPeers(client: TelegramClient, folderId: number) {
  const dialogFilters = await client.invoke(
    new Api.messages.GetDialogFilters()
  );
  const folder = dialogFilters.filters.find(
    (f: any) => f.id === folderId
  ) as any;

  if (folder) {
    return folder.includePeers
      .map((peer: any) => {
        if (peer.userId) {
          return {
            userId: `${peer.userId}`,
            accessHash: `${peer.accessHash}`,
          };
        } else if (peer.channelId) {
          return {
            channelId: `${peer.channelId}`,
            accessHash: `${peer.accessHash}`,
          };
        }

        return null;
      })
      .filter(Boolean);
  } else {
    console.error("Folder not found!");
    return [];
  }
}

export default async () => {
  await client.start({
    phoneNumber: async () =>
      await new Promise((resolve) => {
        rl.question("Please enter your number: ", (phoneNumber) => {
          resolve(phoneNumber);
        });
      }),
    password: async () =>
      await new Promise((resolve) => {
        rl.question("Please enter your password: ", (password) => {
          resolve(password);
        });
      }),
    phoneCode: async () =>
      await new Promise((resolve) => {
        rl.question("Please enter the code you received: ", (code) => {
          resolve(code);
        });
      }),
    onError: (err) => console.log(err),
  });

  console.log("User is connected");
  console.log(
    `Save this string to reuse the session: ${client.session.save()}`
  );

  const { folderId } = userConfig;

  const folderPeers = await getFolderPeers(client, folderId);

  client.addEventHandler(async (event) => {
    const message = event.message;
    const peer: any = await message.getChat();
    const username = peer.username;
    const messageId = message.id;

    const peerId =
      (message.peerId as any).channelId || (message.peerId as any).userId;
    const isPeerInFolder = folderPeers.some(
      (peer: any) =>
        `${peer.channelId}` === `${peerId}` || `${peer.userId}` === `${peerId}`
    );

    if (isPeerInFolder) {
      const channel = await Channel.findOne({ channelId: peerId });
      let messageLink;
      if (username) {
        messageLink = `https://t.me/${username}/${messageId}`;
      } else {
        const fullChat: any = await client.invoke(
          new Api.channels.GetFullChannel({
            channel: peer,
          })
        );
        const inviteLink = fullChat.fullChat.exportedInvite.link;
        messageLink = `${inviteLink}/${messageId}`;
      }
      if (channel?.userIds) {
        for (const userId of channel.userIds) {
          const wordsCollection = await Words.findOne({ userId });

          if (wordsCollection?.words) {
            for (const word of wordsCollection.words) {
              try {
                if (message.message.toLowerCase().includes(word.toLowerCase())) {
                  await bot.telegram.sendMessage(
                    userId,
                    `New message that match "${word}" word: ${messageLink}`
                  );
                  break;
                }
              } catch (err) {
                console.error(`Failed to send message to user ${userId}:`, err);
              }
            }
          }
        }
      }
    }
  }, new NewMessage({}));

  return client;
};
