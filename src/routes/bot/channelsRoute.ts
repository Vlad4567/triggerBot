import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

import { addChannel, channelList, deleteChannel } from "../../controllers/bot/channelsController";
import botActions from "../../commands/botActions";

export default (bot: Telegraf<Context<Update>>) => {
  bot.action(botActions.addChannel, addChannel);

  bot.action(botActions.channelList, channelList);

  bot.action(botActions.deleteChannel, (ctx) => deleteChannel(ctx, bot));
};
