import dotenv from "dotenv";
dotenv.config();
import botService from "./services/bot";
import userService from "./services/user";
import mongoose, { Document } from "mongoose";
import databaseConfig from "./configs/database";
import readline from "readline";

import { IUserSchema } from "./models/userModel";
import botActions from "./commands/botActions";
import http from "http";
import { IProfileItemSchema } from "./models/profile.model";

const { mongoURI } = databaseConfig;

interface UserStatesAction<T, Y = undefined> {
  type: T;
  payload: Y extends undefined ? undefined : Y;
  showMenu?: () => Promise<unknown>;
}

export const userStates = new Map<
  number,
  | typeof botActions.addWord
  | typeof botActions.addChannel
  | typeof botActions.addDarkWord
  | typeof botActions.importSettings
  | typeof botActions.addProfile
  | UserStatesAction<typeof botActions.addProfileWhitelist, IProfileItemSchema['title']>
  | UserStatesAction<typeof botActions.addProfileBlacklist, IProfileItemSchema['title']>
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
