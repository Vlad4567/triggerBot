import { Telegraf } from "telegraf";
import wordsRoute from "../routes/bot/wordsRoute";
import botRoute from "../routes/bot/botRoute";
import channelsRoute from "../routes/bot/channelsRoute";
import configTelegram from "../configs/bot";
import darkWordsRoute from "../routes/bot/darkWordsRoute";
import botSettings from "../routes/bot/settingsRoute";
import profilesRoute from "../routes/bot/profiles.route";

export const bot = new Telegraf(configTelegram.botToken);

export default () => {
  botRoute(bot);
  botSettings(bot);
  channelsRoute(bot);
  darkWordsRoute(bot);
  wordsRoute(bot);
  profilesRoute(bot);

  bot.catch(console.error);
  bot.launch();

  console.log("Telegram Bot started");
};
