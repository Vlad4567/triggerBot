import dotenv from "dotenv";
dotenv.config();
import { Markup, Telegraf } from "telegraf";
import botService from "./services/bot";
import userService from "./services/user";
import errorHandler from "./middlewares/errorHandler";
import logger from "./utils/func/logger";
import mongoose from "mongoose";
import databaseConfig from "./config/database";
import readline from "readline";

const { mongoURI } = databaseConfig;

export const userStates = new Map<number, string>();

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

mongoose.connect(mongoURI);

botService();
userService().catch(logger.error);
