import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { userStates } from "..";
import { showMenu } from "../utils/functions/bot/context";
import { ZodError } from "zod";

export const handleError = (ctx: Context<Update>, err: unknown) => {
  if (err instanceof Error) {
    ctx.reply(err.message);
    console.log(err);
  } else if (err instanceof ZodError) {
    ctx.reply(err.message);
    console.log(err);
  } else {
    ctx.reply("An unknown error occurred");
    if (ctx.from) {
      userStates.delete(ctx.from.id);
    }
    showMenu(ctx);
  }
};
