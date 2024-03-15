import { BaseGuildTextChannel, Message } from 'discord.js';
import { GuildQueue } from 'discord-player';
import { ExtendedClient } from './clientTypes';

export type ClientEventArguments = unknown[];
export type ProcessEventArguments = unknown[];
export type PlayerEventArguments = unknown[];

export type ExtendedGuildQueue = {
    metadata:
        | undefined
        | {
              client: ExtendedClient;
              channel: BaseGuildTextChannel;
              lastMessage: Message;
          };
} & GuildQueue<unknown>;
