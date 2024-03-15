import { ExtendedGuildQueue } from '../../types/eventTypes';
import { useLanguageTranslator } from '../../common/utils/localeUtil';
import {
    ButtonBuilder,
    EmbedBuilder,
    APIButtonComponent,
    LocaleString,
    APIMessageActionRowComponent,
    ButtonStyle,
    APIActionRowComponent,
    ComponentType
} from 'discord.js';
import { EmbedOptions } from '../../types/configTypes';
import { randomUUID as uuidv4 } from 'node:crypto';
import { loggerService, Logger } from '../../common/services/logger';
import { Track } from 'discord-player';
import config from 'config';

module.exports = {
    name: 'playerStart',
    isDebug: false,
    isPlayerEvent: true,
    execute: async (queue: ExtendedGuildQueue, track: Track) => {
        const executionId: string = uuidv4();
        const logger: Logger = loggerService.child({
            module: 'event',
            name: 'playerStart',
            executionId: executionId,
            shardId: queue.metadata?.client.shard?.ids[0],
            guildId: queue.metadata?.channel.guild.id
        });

        logger.debug(`playerStart event: Started playing '${track.url}'.`);

        const { channel, client } = queue.metadata || {};
        const embedOptions: EmbedOptions = config.get('embedOptions');

        if (!embedOptions.behavior.enablePlayerStartMessages) {
            logger.debug('playerStart event: Player start messages are disabled, skipping now-playing message.');
            return;
        }

        if (channel && !client?.channels.cache.get(channel.id)) {
            logger.warn(
                `playerStart event: No channel found for guild ${queue.metadata?.channel.guild.id}, cannot send now-playing message.`
            );
            return;
        }

        const guildLanguage: LocaleString =
            queue.metadata?.client.guilds.cache.get(queue.metadata?.channel.guild.id)?.preferredLocale ?? 'en-US';
        const translator = useLanguageTranslator(guildLanguage);

        const translatedEmbedMessage: string = translator('musicPlayerCommon.nowPlayingTitle', {
            icon: embedOptions.icons.audioStartedPlaying
        });

        const components: APIMessageActionRowComponent[] = [];

        const previousButton: APIButtonComponent = new ButtonBuilder()
            .setDisabled(queue.history.tracks.data.length > 0 ? false : true)
            .setCustomId(`action-previous-button_${track.id}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(embedOptions.icons.previousTrack)
            .toJSON();
        components.push(previousButton);

        const playPauseButton: APIButtonComponent = new ButtonBuilder()
            .setCustomId(`action-pauseresume-button_${track.id}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(embedOptions.icons.pauseResumeTrack)
            .toJSON();
        components.push(playPauseButton);

        const skipButton: APIButtonComponent = new ButtonBuilder()
            .setCustomId(`action-skip-button_${track.id}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(embedOptions.icons.nextTrack)
            .toJSON();
        components.push(skipButton);

        const queueButton: APIButtonComponent = new ButtonBuilder()
            .setCustomId('action-showqueue-button')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(embedOptions.icons.queue)
            .toJSON();
        components.push(queueButton);

        const embedActionRow: APIActionRowComponent<APIMessageActionRowComponent> = {
            type: ComponentType.ActionRow,
            components
        };

        const embed = new EmbedBuilder()
            .setAuthor({
                name: track.requestedBy?.username as string,
                iconURL: track.requestedBy?.displayAvatarURL()
            })
            .setDescription(`${translatedEmbedMessage}\n\`${track.duration}\` [**${track.title}**](${track.url})`)
            .setThumbnail(track.thumbnail)
            .setColor(embedOptions.colors.cadence);
        try {
            const announceMessage = await channel?.send({
                embeds: [embed],
                components: [embedActionRow]
            });

            if (queue.metadata && announceMessage) {
                queue.metadata.lastMessage = announceMessage;
                logger.debug(`playerStart event: updated lastMessage in queue metadata to ${announceMessage.id}.`);
            }

            logger.debug(`playerStart event: now-playing message sent with the ID ${announceMessage?.id}.`);
        } catch (error) {
            logger.error(error, `playerStart event: Error trying to send now-playing message for track ${track.url}`);
            return;
        }
    }
};
