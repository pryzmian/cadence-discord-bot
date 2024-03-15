import { GuildQueue, useQueue } from 'discord-player';
import {
    APIActionRowComponent,
    APIMessageActionRowComponent,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    EmbedFooterData,
    MessageComponentInteraction
} from 'discord.js';
import { BaseComponentInteraction } from '../../common/classes/ComponentInteraction';
import { BaseComponentParams, BaseComponentReturnType } from '../../types/interactionTypes';
import { checkQueueCurrentTrack, checkQueueExists } from '../../common/validation/queueValidator';
import { checkInVoiceChannel, checkSameVoiceChannel } from '../../common/validation/voiceChannelValidator';
import { useServerTranslator, Translator } from '../../common/utils/localeUtil';
import { formatDuration, formatRepeatModeDetailed, formatSlashCommand } from '../../common/utils/formattingUtils';
import { Logger } from '../../common/services/logger';
import { usePlayer } from 'discord-player';

class ActionShowQueueButton extends BaseComponentInteraction {
    constructor() {
        super('action-showqueue-button');
    }

    async execute(params: BaseComponentParams): BaseComponentReturnType {
        const { executionId, interaction } = params;
        const logger = this.getLogger(this.name, executionId, interaction);
        const player = usePlayer(interaction.guild!);

        const queue: GuildQueue = useQueue(interaction.guild!.id)!;

        await this.runValidators({ interaction, queue, executionId }, [checkQueueExists, checkQueueCurrentTrack]);

        logger.debug('Handling queue pagination.');
        console.log(player?.queue);
        return await this.handlePaginateQueue(interaction, queue, logger);
    }

    private async handlePaginateQueue(
        interaction: MessageComponentInteraction,
        queue: GuildQueue,
        logger: Logger
    ): Promise<void> {
        const tracksToDisplay = 10;
        const queueSize = queue.tracks.data.length;

        const translator = useServerTranslator(interaction);

        const buttonBuilders: ButtonBuilder[] = [
            new ButtonBuilder()
                .setCustomId('previous-page')
                .setEmoji(this.embedOptions.icons.previousPage)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('next-page')
                .setEmoji(this.embedOptions.icons.nextPage)
                .setStyle(ButtonStyle.Secondary)
        ];

        const actionRow: APIActionRowComponent<APIMessageActionRowComponent> = {
            type: ComponentType.ActionRow,
            components: buttonBuilders.map((button) => button.toJSON())
        };

        let currentPage = 0;
        const embedDescription = [
            `${this.getDisplayTrackPlayingStatus(queue, translator)}\n${this.getFormattedTrackUrl(queue.currentTrack!, translator)}\n`,
            `${translator('musicPlayerCommon.requestedBy', { user: this.getDisplayTrackRequestedBy(queue.currentTrack!, translator) })}\n`,
            `${this.getDisplayQueueProgressBar(queue, translator)}\n`,
            `${formatRepeatModeDetailed(queue.repeatMode, this.embedOptions, translator)}\n`,
            `${translator('commands.queue.tracksInQueueTitle', { icon: this.embedOptions.icons.queue })}\n`,
            `${this.getFormattedTracksMap(queue, currentPage, tracksToDisplay, translator)}`
        ];

        const totalPages = Math.max(1, Math.ceil(queueSize / tracksToDisplay));

        const queueResponseEmbed = new EmbedBuilder()
            .setColor(this.embedOptions.colors.info)
            .setAuthor(this.getEmbedQueueAuthor(interaction, queue, translator))
            .setDescription(embedDescription.join('\n'))
            .setThumbnail(this.getTrackThumbnailUrl(queue.currentTrack!))
            .setFooter(this.getDisplayFullFooterInfo(currentPage, queue, translator));

        const response = await interaction.reply({
            embeds: [queueResponseEmbed.toJSON()],
            components: [actionRow],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            componentType: ComponentType.Button,
            time: 30000
        });

        collector.on('collect', async (button) => {
            collector.resetTimer();

            if (button.customId === 'previous-page') {
                // if the current page is 0, do nothing
                if (currentPage === 0) {
                    await button.reply({
                        embeds: [
                            new EmbedBuilder().setColor(this.embedOptions.colors.error).setDescription(
                                translator('commands.queue.noMorePages', {
                                    icon: this.embedOptions.icons.error,
                                    playCommand: formatSlashCommand('play', translator)
                                })
                            )
                        ],
                        ephemeral: true
                    });
                }

                currentPage = Math.max(currentPage - 1, 0);
            } else if (button.customId === 'next-page') {
                // if the current page is the last page, do nothing
                if (currentPage === totalPages - 1) {
                    await button.reply({
                        embeds: [
                            new EmbedBuilder().setColor(this.embedOptions.colors.error).setDescription(
                                translator('commands.queue.noMorePages', {
                                    icon: this.embedOptions.icons.error,
                                    playCommand: formatSlashCommand('play', translator)
                                })
                            )
                        ],
                        ephemeral: true
                    });
                }

                currentPage = Math.min(currentPage + 1, totalPages - 1);
            }

            const newEmbedDescription = [
                `${this.getDisplayTrackPlayingStatus(queue, translator)}\n${this.getFormattedTrackUrl(queue.currentTrack!, translator)}\n`,
                `${translator('musicPlayerCommon.requestedBy', { user: this.getDisplayTrackRequestedBy(queue.currentTrack!, translator) })}\n`,
                `${this.getDisplayQueueProgressBar(queue, translator)}\n`,
                `${formatRepeatModeDetailed(queue.repeatMode, this.embedOptions, translator)}\n`,
                `${translator('commands.queue.tracksInQueueTitle', { icon: this.embedOptions.icons.queue })}\n`,
                `${this.getFormattedTracksMap(queue, currentPage, tracksToDisplay, translator)}`
            ];

            queueResponseEmbed.setDescription(newEmbedDescription.join(''));
            queueResponseEmbed.setFooter(this.getDisplayFullFooterInfo(currentPage, queue, translator));

            buttonBuilders[0].setDisabled(currentPage === 0 ?? queueSize === 0);
            buttonBuilders[1].setDisabled(currentPage === totalPages - 1 ?? queueSize === 0);

            try {
                await button.update({
                    embeds: [queueResponseEmbed.toJSON()],
                    components: [actionRow]
                });
            } catch (error) {
                logger.error(error, 'Error updating queue response pagination');
                await button.reply({
                    embeds: [
                        new EmbedBuilder().setColor(this.embedOptions.colors.error).setDescription(
                            translator('commands.queue.paginationError', {
                                icon: this.embedOptions.icons.error
                            })
                        )
                    ],
                    ephemeral: true
                });
            }
        });

        collector.on('end', async () => {
            try {
                await response.delete();
            } catch (error) {
                logger.error(error, 'Error ending queue response pagination');
            }
        });
    }

    private getDisplayTrackPlayingStatus = (queue: GuildQueue, translator: Translator): string => {
        return queue.node.isPaused()
            ? translator('musicPlayerCommon.nowPausedTitle', { icon: this.embedOptions.icons.paused })
            : translator('musicPlayerCommon.nowPlayingTitle', { icon: this.embedOptions.icons.audioPlaying });
    };

    private getDisplayQueueTotalDuration(queue: GuildQueue, translator: Translator): string {
        if (queue.tracks.data.length > 1000) {
            return translator('commands.queue.estimatedReallyLongTime', {
                playCommand: formatSlashCommand('play', translator)
            });
        }

        let queueDurationMs: number = queue.estimatedDuration;
        if (queue.currentTrack) {
            queueDurationMs += queue.currentTrack.durationMS;
        }

        if (queueDurationMs < 0) {
            return translator('commands.queue.estimatedReallyLongTime', {
                playCommand: formatSlashCommand('play', translator)
            });
        }

        return translator('commands.queue.estimatedDuration', {
            duration: formatDuration(queueDurationMs)
        });
    }

    private getFormattedTracksMap(
        queue: GuildQueue,
        pageIndex: number,
        tracksToDisplay: number,
        translator: Translator
    ): string {
        if (!queue || queue.tracks.data.length === 0) {
            return translator('commands.queue.emptyQueue', {
                playCommand: formatSlashCommand('play', translator)
            });
        }

        const start = pageIndex * tracksToDisplay;

        return queue.tracks.data
            .slice(start, start + tracksToDisplay)
            .map((track, index) => {
                return `**${pageIndex * 10 + index + 1}.** ${this.getDisplayTrackDurationAndUrl(track, translator)}`;
            })
            .join('\n');
    }

    private getDisplayFullFooterInfo(currentPage: number, queue: GuildQueue, translator: Translator): EmbedFooterData {
        const pagination = this.getFooterDisplayPageInfo(currentPage, queue, translator);
        const totalDuration = this.getDisplayQueueTotalDuration(queue, translator);

        const fullFooterData = {
            text: `${pagination.text} - ${totalDuration}`
        };

        return fullFooterData;
    }
}

export default new ActionShowQueueButton();
