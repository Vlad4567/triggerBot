import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { startKeyboard } from "../commands/botKeyboards";

export default (bot: Telegraf<Context<Update>>) => {
  bot.command("start", async (ctx) => {
    try {
      ctx.reply("Choose your option", startKeyboard);
    } catch (err) {
      ctx.reply("An error occurred while starting the bot.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Restart bot", callback_data: "restart_bot" }],
          ],
        },
      });
    }
  });
};
