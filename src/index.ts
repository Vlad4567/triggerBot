import dotenv from "dotenv";
dotenv.config();
import botService from "./services/bot";
import userService from "./services/user";
import mongoose, { Document } from "mongoose";
import databaseConfig from "./configs/database";
import readline from "readline";

import { IUserSchema } from "./models/userModel";
import botActions from "./commands/botActions";

const { mongoURI } = databaseConfig;

export const userStates = new Map<
  number,
  | typeof botActions.addWord
  | typeof botActions.addChannel
  | typeof botActions.addDarkWord
>();
export const users = new Map<
  number,
  Document<unknown, {}, IUserSchema> & IUserSchema & Required<{ _id: unknown }>
>();

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

mongoose.connect(mongoURI);

botService();
userService().catch(console.error);
