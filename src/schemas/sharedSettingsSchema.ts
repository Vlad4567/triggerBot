import { z } from 'zod';
import { IUserSchema } from '../models/userModel';
import { IChannelSchema } from '../models/channelModel';
import { IDarkWordsSchema } from '../models/darkWordsModel';
import { IWordsSchema } from '../models/wordsModel';
import { IProfileItemSchema } from '../models/profile.model';

export interface ISharedSettingsChannel {
  channelId: IChannelSchema['channelId'],
  accessHash: IChannelSchema['accessHash']
}

export interface ISharedSettingsProfile {
  title: IProfileItemSchema['title']
  whitelist: IProfileItemSchema['whitelist']
  blacklist: IProfileItemSchema['blacklist']
}

export interface ISharedSettingsSchema {
  user: IUserSchema['telegramId']
  whitelist?: IWordsSchema['words']
  blacklist?: IDarkWordsSchema['darkWords']
  channels?: ISharedSettingsChannel[]
  profiles?: ISharedSettingsProfile[]
}

export const sharedSettingsSchema: z.ZodType<ISharedSettingsSchema> = z.object({
  user: z.number({ message: 'User ID was not provided' }),
  whitelist: z.array(z.string()).optional(),
  blacklist: z.array(z.string()).optional(),
  channels: z.array(z.object({
    channelId: z.string(),
    accessHash: z.string()
  })).optional(),
  profiles: z.array(z.object({
    title: z.string(),
    whitelist: z.array(z.string()),
    blacklist: z.array(z.string()),
  })).optional()
});