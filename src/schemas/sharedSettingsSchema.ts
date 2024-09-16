import { z } from 'zod';
import { IUserSchema } from '../models/userModel';
import { IChannelSchema } from '../models/channelModel';
import { IDarkWordsSchema } from '../models/darkWordsModel';
import { IWordsSchema } from '../models/wordsModel';

export interface ISharedSettingsSchema {
  user: IUserSchema['telegramId']
  whitelist?: IWordsSchema['words']
  blacklist?: IDarkWordsSchema['darkWords']
  channels?: {
    channelId: IChannelSchema['channelId'],
    accessHash: IChannelSchema['accessHash']
  }[]
}

export const sharedSettingsSchema: z.ZodType<ISharedSettingsSchema> = z.object({
  user: z.number({ message: 'User ID was not provided' }),
  whitelist: z.array(z.string()).optional(),
  blacklist: z.array(z.string()).optional(),
  channels: z.array(z.object({
    channelId: z.string(),
    accessHash: z.string()
  })).optional()
});