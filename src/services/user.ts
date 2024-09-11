import { StringSession } from "telegram/sessions";
import userConfig from "../configs/user";
import { rl } from "..";
import { TelegramClient } from "telegram";
import userRoute from "../routes/user/userRoute";

const { apiId, apiHash } = userConfig;

const stringSession = new StringSession(userConfig.stringSession);

export const client = new TelegramClient(stringSession, +apiId, apiHash, {
  connectionRetries: 5,
});

export default async () => {
  await client.start({
    phoneNumber: async () =>
      await new Promise((resolve) => {
        rl.question("Please enter your number: ", (phoneNumber) => {
          resolve(phoneNumber);
        });
      }),
    password: async () =>
      await new Promise((resolve) => {
        rl.question("Please enter your password: ", (password) => {
          resolve(password);
        });
      }),
    phoneCode: async () =>
      await new Promise((resolve) => {
        rl.question("Please enter the code you received: ", (code) => {
          resolve(code);
        });
      }),
    onError: (err) => console.log(err),
  });

  console.log("User is connected");
  console.log(
    `Save this string to reuse the session: ${client.session.save()}`
  );

  userRoute();

  return client;
};
