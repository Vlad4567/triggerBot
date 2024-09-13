import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

export const handleError = (ctx: Context<Update>, err: unknown) => {
  if (err instanceof Error) {
    ctx.reply(err.message);
    console.log(err);
  } else {
    ctx.reply("An unknown error occurred");
  }
}
