import dotenv from "dotenv";
dotenv.config();
import botService from "./services/bot";
import userService from "./services/user";
import mongoose, { Document } from "mongoose";
import databaseConfig from "./configs/database";
import readline from "readline";

import { IUserSchema } from "./models/userModel";
import botActions from "./commands/botActions";
import http from 'http';

const { mongoURI } = databaseConfig;

export const userStates = new Map<
  number,
  | typeof botActions.addWord
  | typeof botActions.addChannel
  | typeof botActions.addDarkWord
  | typeof botActions.importSettings
  | typeof botActions.exportSettings
>();
export const users = new Map<
  number,
  Document<unknown, {}, IUserSchema> & IUserSchema & Required<{ _id: unknown }>
>();

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello, World!\n");
  })
  .listen(process.env.PORT || 3000);

mongoose.connect(mongoURI);

botService();
userService().catch(console.error);
