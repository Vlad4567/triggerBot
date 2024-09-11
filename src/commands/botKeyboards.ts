import botActions from "./botActions";

export const CANCEL_COMMAND = "/cancel";

export const startKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "Add words", callback_data: botActions.addWord },
        { text: "Word list", callback_data: botActions.wordList },
        { text: "Delete words", callback_data: botActions.deleteWords },
      ],
      [
        { text: "Add dark words", callback_data: botActions.addDarkWord },
        { text: "Dark word list", callback_data: botActions.darkWordList },
        { text: "Delete dark words", callback_data: botActions.deleteDarkWords },
      ],
      [
        { text: "Add channel", callback_data: botActions.addChannel },
        { text: "Channel list", callback_data: botActions.channelList },
        { text: "Delete channel", callback_data: botActions.deleteChannel },
      ],
    ],
  },
};
