import botActions from "./botActions";

export const startKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "Add words", callback_data: botActions.addWord },
        { text: "List of words", callback_data: botActions.listWords },
        { text: "Delete words", callback_data: botActions.deleteWords },
      ],
      [
        { text: "Add channel", callback_data: botActions.addChannel },
        { text: "List of channels", callback_data: botActions.listOfChannels },
        { text: "Delete channel", callback_data: botActions.deleteChannel },
      ],
    ],
  },
};
