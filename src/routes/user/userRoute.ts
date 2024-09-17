import { client } from "../../services/user";
import userConfig from "../../configs/user";
import { getFolderPeers } from "../../utils/functions/user/folder";
import ChannelModel from "../../models/channelModel";
import WordsModel from "../../models/wordsModel";
import DarkWordsModel from "../../models/darkWordsModel";
import { Api } from "telegram";
import { bot } from "../../services/bot";
import { NewMessage } from "telegram/events";
import { Entity } from "telegram/define";

export default async () => {
  const { folderId } = userConfig;

  const folderPeers = await getFolderPeers(client, folderId);

  client.addEventHandler(async (event) => {
    const message = event.message;
    const peer: any = await message.getChat();
    const sender: any = await message.getSender();
    const username = peer?.username;
    const messageId = message.id;

    const peerId =
      (message.peerId as any).channelId || (message.peerId as any).userId;
    const isPeerInFolder = folderPeers.some(
      (peer: any) =>
        `${peer.channelId}` === `${peerId}` || `${peer.userId}` === `${peerId}`
    );

    if (isPeerInFolder) {
      const channel = await ChannelModel.findOne({ channelId: peerId });
      let messageLink;
      if (username) {
        messageLink = `https://t.me/${username}/${messageId}`;
      } else {
        const fullChat: any = await client.invoke(
          new Api.channels.GetFullChannel({
            channel: peer,
          })
        );
        const inviteLink: string | undefined = fullChat.fullChat.exportedInvite?.link;
        messageLink = `${inviteLink}/${messageId}`;
      }
      if (channel?.users) {
        for (const userId of channel.users) {
          const wordsCollection = await WordsModel.findOne({ user: userId });
          const darkWordsCollection = await DarkWordsModel.findOne({
            user: userId,
          });

          if (wordsCollection?.words) {
            for (const word of wordsCollection.words) {
              try {
                if (
                  message.message.toLowerCase().includes(word.toLowerCase()) &&
                  !darkWordsCollection?.darkWords.some((darkWord) =>
                    message.message
                      .toLowerCase()
                      .includes(darkWord.toLowerCase())
                  )
                ) {
                  await bot.telegram.sendMessage(
                    userId,
                    `<b>🗨️ Message:</b> ${message.message}

🔗 <a href="${messageLink}">View Message</a>

<b>👤 From:</b> ${
                      sender.username
                        ? `<a href="https://t.me/@${sender.username}">`
                        : ""
                    }${sender.firstName}${
                      sender.lastName ? ` ${sender.lastName}` : ""
                    }${sender.username ? ` (@${sender.username})` : ""}${
                      sender.username ? "</a>" : ""
                    }${
                      sender.phone
                        ? `\n\n<b>☎️ Phone:</b> ${sender.phone}`
                        : ""
                    }

<b>📢 Channel:</b> ${peer.username ? `<a href="https://t.me/@${peer.username}">` : ""}${peer.title}${peer.username ? "</a>" : ""}`,
                    { parse_mode: "HTML" }
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
};
