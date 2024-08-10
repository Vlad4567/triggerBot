import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

export default (err: unknown, ctx: Context<Update>) => {
  console.error(`Error for ${ctx.updateType}`, err);
};
