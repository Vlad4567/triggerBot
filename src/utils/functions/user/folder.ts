import { Api, TelegramClient } from "telegram";

export const getFolderPeers = async (
  client: TelegramClient,
  folderId: number
) => {
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
};
