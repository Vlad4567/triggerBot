import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

import botController from "../controllers/botController";
import wordsController from "../controllers/wordsController";
import channelsController from "../controllers/channelsController";

export default (bot: Telegraf<Context<Update>>) => {
  botController(bot);
  wordsController(bot);
  channelsController(bot);
};
