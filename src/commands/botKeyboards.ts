import botActions from "./botActions";

export const CANCEL_COMMAND = "/cancel";

export interface IKeyboardButton {
  text: string;
  callback_data:
    | (typeof botActions)[keyof typeof botActions]
    | typeof CANCEL_COMMAND;
}

export interface IKeyboard {
  reply_markup: {
    inline_keyboard: IKeyboardButton[][];
  };
}

export const startKeyboard: IKeyboard = {
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
      [{ text: "Settings", callback_data: botActions.settings }],
    ],
  },
};

export const settingsKeyboard: IKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "Import", callback_data: botActions.importSettings },
        { text: "Export", callback_data: botActions.exportSettings },
      ],
      [{ text: "Back", callback_data: CANCEL_COMMAND }],
    ],
  },
};
