import botActions from "./botActions";

export const CANCEL_COMMAND = "/cancel";

export const startKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "+ Whitelist", callback_data: botActions.addWord },
        { text: "all Whitelist", callback_data: botActions.wordList },
        { text: "- Whitelist", callback_data: botActions.deleteWords },
      ],
      [
        { text: "+ Blacklist", callback_data: botActions.addDarkWord },
        { text: "all Blacklist", callback_data: botActions.darkWordList },
        { text: "- Blacklist", callback_data: botActions.deleteDarkWords },
      ],
      [
        { text: "+ Channel", callback_data: botActions.addChannel },
        { text: "Channels", callback_data: botActions.channelList },
        { text: "- Channel", callback_data: botActions.deleteChannel },
      ],
    ],
  },
};
