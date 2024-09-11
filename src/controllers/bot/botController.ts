import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { users, userStates } from "../..";
import botActions from "../../commands/botActions";
import Channel from "../../models/channelModel";
import Word from "../../models/wordsModel";
import DarkWordModel from "../../models/darkWordsModel";
import { CANCEL_COMMAND } from "../../commands/botKeyboards";
import { handleError } from "../../middlewares/errorHandler";
import UserModel from "../../models/userModel";
import {
  addNewChannel,
  addUserToExistingChannel,
  checkIfJoined,
  resolveChannel,
} from "../../utils/functions/bot/channel";
import {
  addWordToExistingCollection,
  createNewWordCollection,
} from "../../utils/functions/bot/word";
import { createNewUserCollection } from "../../utils/functions/bot/user";
import { showMenu } from "../../utils/functions/bot/context";
import { addDarkWordToExistingCollection, createNewDarkWordCollection } from "../../utils/functions/bot/darkWord";

const handleAddChannel = async (ctx: Context<Update>) => {
  const replyProvideChannels = async () => {
    await ctx.reply(
      `Please provide channels one by one in one of the following ways to add: "https://t.me/UkraineThai1", "@UkraineThai1" or type "${CANCEL_COMMAND}" to cancel`,
      {
        reply_markup: {
          keyboard: [[{ text: CANCEL_COMMAND }]],
        },
      }
    );
  };

  const link =
    ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";
  const channelLink = link.startsWith("@")
    ? link.slice(1)
    : link.split("/").slice(-1)[0];

  try {
    const channel = await resolveChannel(channelLink);
    const isJoined = await checkIfJoined(channel);
    const channelDB = await Channel.findOne({ channelId: channel.chats[0].id });

    if (channelDB?.users.includes(ctx.from!.id)) {
      await ctx.reply("You have already added this channel");
    } else if (channelDB) {
      await addUserToExistingChannel(channelDB, ctx);
    } else if (isJoined) {
      await ctx.reply(
        "This channel is not included into folder (unavailable for now)"
      );
    } else {
      await addNewChannel(channel, link, ctx);
    }
  } catch (err) {
    handleError(ctx, err);
  }

  await replyProvideChannels();
};

const handleAddWord = async (ctx: Context<Update>) => {
  const replyProvideWords = () => {
    ctx.reply(
      `Please provide word(s) to add or type "${CANCEL_COMMAND}" to cancel`,
      {
        reply_markup: {
          keyboard: [[{ text: CANCEL_COMMAND }]],
        },
      }
    );
  };

  const word = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const user = ctx.from!.id;
  const wordsCollection = await Word.findOne({ user });

  if (!wordsCollection) {
    await createNewWordCollection(word, user, ctx);
  } else {
    const hasDuplicate = wordsCollection.words.some(
      (item) => item.toLowerCase() === word.toLowerCase()
    );

    if (!hasDuplicate) {
      await addWordToExistingCollection(word, wordsCollection, ctx);
    } else {
      await ctx.reply("Word already exists.");
    }
  }

  replyProvideWords();
};

const handleAddDarkWord = async (ctx: Context<Update>) => {
  const replyProvideWords = () => {
    ctx.reply(
      `Please provide dark word(s) to add or type "${CANCEL_COMMAND}" to cancel`,
      {
        reply_markup: {
          keyboard: [[{ text: CANCEL_COMMAND }]],
        },
      }
    );
  };

  const word = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const user = ctx.from!.id;
  const wordsCollection = await DarkWordModel.findOne({ user });

  if (!wordsCollection) {
    await createNewDarkWordCollection(word, user, ctx);
  } else {
    const hasDuplicate = wordsCollection.darkWords.some(
      (item) => item.toLowerCase() === word.toLowerCase()
    );

    if (!hasDuplicate) {
      await addDarkWordToExistingCollection(word, wordsCollection, ctx);
    } else {
      await ctx.reply("Dark word already exists.");
    }
  }

  replyProvideWords();
};

// ------------------------------------------------------------------------

export const botStart = async (ctx: Context<Update>) => {
  try {
    await showMenu(ctx);
  } catch (err) {
    ctx.reply("An error occurred while starting the bot.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Restart bot", callback_data: "restart_bot" }],
        ],
      },
    });
  }
};

export const botCancel = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    if (userStates.has(ctx.from.id)) {
      userStates.delete(ctx.from.id);
    } else {
      ctx.reply("You have no active operations to cancel.");
    }

    await showMenu(ctx)
  } catch (err) {
    handleError(ctx, err);
  }
};

export const botText = async (ctx: Context<Update>) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const user = ctx.from.id;
    const state = userStates.get(user);

    switch (state) {
      case botActions.addChannel:
        await handleAddChannel(ctx);
        break;
      case botActions.addWord:
        await handleAddWord(ctx);
        break;
      case botActions.addDarkWord:
        await handleAddDarkWord(ctx);
        break;
      default:
        await showMenu(ctx)
        userStates.delete(user)
    }
  } catch (err) {
    handleError(ctx, err);
  }
};

export const useAddUser = async (
  ctx: Context<Update>,
  next: () => Promise<void>
) => {
  try {
    if (!ctx.from) {
      throw new Error("User information is missing");
    }

    const userId = ctx.from.id;

    if (!users.has(userId)) {
      const user = await UserModel.findOne({ telegramId: userId });

      if (!user) {
        const newUserModel = await createNewUserCollection(ctx);
        users.set(userId, newUserModel);
      } else {
        users.set(userId, user);
      }
    }

    await next();
  } catch (err) {
    handleError(ctx, err);
  }
};
