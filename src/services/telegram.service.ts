// src/services/bot.service.ts
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

export const bot:Telegraf = new Telegraf(process.env.BOT_TOKEN!);

export class NotificationService {
  static async initBot(webhookUrl?: string): Promise<any> {
    // 1. Basic Commands
    bot.start((ctx) => {
      const miniAppUrl = process.env.FRONTEND_URL || '';
      ctx.reply(`Welcome to Keni's Design Atelier 👗\n\nExperience bespoke fashion tailored to your silhouette. Click the button below to browse our collections or start a custom creation.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✨ Open Atelier App", web_app: { url: miniAppUrl } }]
          ]
        }
      });
    });

    bot.command('myorders', (ctx) => {
      const url = `${process.env.FRONTEND_URL}?view=my-orders`;
      ctx.reply(`📦 <b>Track Your Masterpieces</b>\n\nClick below to view your active orders, track production progress, and manage revisions.`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "📽️ View My Orders", web_app: { url } }]
          ]
        }
      });
    });

    bot.command('collections', (ctx) => {
      const url = `${process.env.FRONTEND_URL}?view=collections`;
      ctx.reply(`🏛️ <b>The Atelier Vault</b>\n\nExplore our latest seasonal collections and signature pieces designed for timeless elegance.`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "💎 Browse Collections", web_app: { url } }]
          ]
        }
      });
    });

    bot.command('help', (ctx) => {
      ctx.reply(`<b>Need Assistance?</b> 🕊️\n\n• Use /start to launch the main app\n• Use /myorders to track your pieces\n• Use /collections to see our latest work\n\nFor direct support or to discuss a unique vision, contact our designer: <a href="https://t.me/kofi251">@kofi251</a>`, {
        parse_mode: 'HTML'
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

  static async notifyAdmins(message: string) {
    const adminIds = (process.env.ADMIN_CHAT_ID || '').split(',').map(id => id.trim());
    await Promise.all(adminIds.map(id => {
        if (id) return this.sendUpdate(id, message);
        return Promise.resolve();
    }));
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