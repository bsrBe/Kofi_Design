// src/services/bot.service.ts
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

export const bot:Telegraf = new Telegraf(process.env.BOT_TOKEN!);

export class NotificationService {
  static async initBot(webhookUrl?: string): Promise<any> {
    // 1. Basic Commands
    bot.start((ctx) => {
      if(!process.env.FRONTEND_URL){
        throw new Error('Environment Variable FRONTEND_URL not added');
      }
      const miniAppUrl = process.env.FRONTEND_URL;
      ctx.reply(`Welcome to Kofi Design! 👗\n\nClick the button below to start your order.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Open App", web_app: { url: miniAppUrl } }]
          ]
        }
      });
    });

    // 2. Production Webhook vs Local Polling
    if (webhookUrl) {
      const path = '/api/bot-webhook';
      console.log(`🤖 Setting Bot Webhook: ${webhookUrl}${path}`);
      await bot.telegram.setWebhook(`${webhookUrl}${path}`);
      return bot.webhookCallback(path);
    } else {
      console.log('🤖 Bot starting with Long Polling (Local)...');
      bot.launch().catch(err => console.error("Bot launch failed:", err));
      return null;
    }
  }

  static async sendUpdate(chatId: string, message: string) {
    try {
      await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (err) {
      console.error("Notify fail:", err);
    }
  }

  static async uploadPhoto(buffer: Buffer, attempts: number = 3): Promise<string> {
    if(!process.env.STORAGE_CHANNEL_ID){
         throw new Error('Environment Variable STORAGE_CHANNEL_ID not added');
    }

    for (let i = 0; i < attempts; i++) {
        try {
            const msg = await bot.telegram.sendPhoto(process.env.STORAGE_CHANNEL_ID, { source: buffer });
            
            if (!msg.photo || msg.photo.length === 0) {
              throw new Error('No photo data received from Telegram');
            }
            
            // Get the highest resolution photo (last element in array)
            return msg.photo[msg.photo.length - 1]!.file_id;
        } catch (err: any) {
            console.error(`Upload attempt ${i + 1} failed:`, err.message);
            if (i === attempts - 1) throw err; // Re-throw on last attempt
            
            // Wait 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    throw new Error('Upload failed after multiple attempts');
  }

  static async getFileUrl(fileId: string): Promise<string> {
    try {
      const link = await bot.telegram.getFileLink(fileId);
      return link.toString();
    } catch (err) {
      console.error("Get file link fail:", err);
      throw err;
    }
  }
}