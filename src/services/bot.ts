import mongoose from "mongoose";
import database from "../config/database";
import { Update } from "telegraf/typings/core/types/typegram";
import { Context, Telegraf } from "telegraf";
import wordRoutes from "../routes/wordRoutes";
import Word from "../models/wordModels";
import configTelegram from "../config/bot";
import errorHandler from "../middlewares/errorHandler";
import logger from "../utils/func/logger";

const { mongoURI } = database;
export const bot = new Telegraf(configTelegram.botToken);

export default () => {

  wordRoutes(bot);

  bot.catch(errorHandler);
  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  logger.log("Telegram Bot started");
};
