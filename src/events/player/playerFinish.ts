import { ExtendedGuildQueue } from '../../types/eventTypes';
import { randomUUID as uuidv4 } from 'node:crypto';
import { loggerService, Logger } from '../../common/services/logger';
import { Track } from 'discord-player';
import { Snowflake } from 'discord.js';

// Emitted when the audio player finish playing a track.
module.exports = {
    name: 'playerFinish',
    isDebug: false,
    isPlayerEvent: true,
    execute: async (queue: ExtendedGuildQueue, track: Track) => {
        const executionId: string = uuidv4();
        const logger: Logger = loggerService.child({
            module: 'event',
            name: 'playerFinish',
            executionId: executionId,
            shardId: queue.metadata?.client.shard?.ids[0],
            guildId: queue.metadata?.channel.guild.id
        });

        logger.debug(`playerFinish event: Track [${track.url}] finished playing.`);

        const { lastMessage } = queue.metadata || {};
        const fetchLastAnnounceMessage =
            (await queue.metadata?.channel.messages.fetch(lastMessage?.id as Snowflake)) || undefined;

        if (fetchLastAnnounceMessage && fetchLastAnnounceMessage.deletable) {
            try {
                await fetchLastAnnounceMessage.delete();
                logger.debug(
                    `playerFinish event: Now-playing message with the ID ${fetchLastAnnounceMessage.id} deleted.`
                );
            } catch (error) {
                logger.error(
                    error,
                    `playerFinish event: Error deleting previous now-playing message with the ID ${fetchLastAnnounceMessage.id}.`
                );
            }
        }
    }
};
