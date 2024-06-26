import config from 'config';
import { GuildQueue, GuildQueueHistory, PlayerTimestamp, Track } from 'discord-player';
import {
    ApplicationCommandOptionChoiceData,
    EmbedFooterData,
    Interaction,
    Message,
    MessageComponentInteraction
} from 'discord.js';
import { loggerService, Logger } from '../../services/logger';
import { BotOptions, EmbedOptions, PlayerOptions } from '../../../types/configTypes';
import { BaseInteractionParams } from '../../../types/interactionTypes';
import { Validator, ValidatorParams } from '../../../types/utilTypes';
import { Translator } from '../../utils/localeUtil';

export abstract class BaseInteraction {
    embedOptions: EmbedOptions;
    botOptions: BotOptions;
    playerOptions: PlayerOptions;

    constructor() {
        this.embedOptions = config.get('embedOptions');
        this.botOptions = config.get('botOptions');
        this.playerOptions = config.get('playerOptions');
    }

    protected getLoggerBase(
        module: string,
        name: string,
        executionId: string,
        interaction: Interaction | MessageComponentInteraction
    ): Logger {
        return loggerService.child({
            module: module,
            name: name,
            executionId: executionId,
            shardId: interaction.guild?.shardId,
            guildId: interaction.guild?.id
        });
    }

    protected validators: Validator[] = [];

    protected async runValidators(args: ValidatorParams, validators?: Validator[]): Promise<void> {
        for (const validator of validators ? validators : this.validators) {
            await validator(args);
        }
    }

    protected getFormattedDuration(track: Track): string {
        let durationFormat =
            Number(track.raw.duration) === 0 || track.duration === '0:00' ? '' : `**\`${track.duration}\`**`;

        if (track.raw.live) {
            durationFormat = `**${this.embedOptions.icons.liveTrack} \`LIVE\`**`;
        }

        return durationFormat;
    }

    protected getFormattedTrackUrl(track: Track, translator: Translator): string {
        const trackTitle = track.title ?? translator('musicPlayerCommon.unavailableTrackTitle');
        const trackUrl = track.url ?? track.raw.url;
        if (!trackTitle || !trackUrl) {
            return translator('musicPlayerCommon.unavailableTrackUrl');
        }
        return `**[${trackTitle}](${trackUrl})**`;
    }

    protected getDisplayTrackDurationAndUrl(track: Track, translator: Translator): string {
        const formattedDuration = this.getFormattedDuration(track);
        const formattedUrl = this.getFormattedTrackUrl(track, translator);

        return `${formattedDuration} ${formattedUrl}`;
    }

    protected getTrackThumbnailUrl(track: Track): string {
        let thumbnailUrl = '';

        if (track.source === 'youtube') {
            if (track.raw.thumbnail) {
                // @ts-ignore -- discord-player bug with thumbnail for youtube?
                thumbnailUrl = track.raw.thumbnail.url;
            } else if (track.thumbnail && !track.thumbnail.endsWith('maxresdefault.jpg')) {
                // @ts-ignore -- discord-player bug with thumbnail for youtube?
                thumbnailUrl = track.thumbnail.url;
            } else {
                thumbnailUrl = this.embedOptions.info.fallbackThumbnailUrl;
            }
        } else {
            if (track.raw.thumbnail) {
                thumbnailUrl = track.raw.thumbnail;
            } else if (track.thumbnail) {
                thumbnailUrl = track.thumbnail;
            } else {
                thumbnailUrl = this.embedOptions.info.fallbackThumbnailUrl;
            }
        }

        return thumbnailUrl;
    }

    protected getFooterDisplayPageInfo(
        currentPage: number,
        queue: GuildQueue | GuildQueueHistory,
        translator: Translator
    ): EmbedFooterData {
        const pageIndex: number = currentPage;
        const totalPages: number = Math.ceil(queue.tracks.data.length / 10) || 1;
        return {
            text: translator('musicPlayerCommon.footerPageNumber', {
                page: pageIndex + 1,
                pageCount: totalPages,
                count: queue.tracks.data.length
            })
        };
    }

    protected getDisplayTrackRequestedBy = (track: Track, translator: Translator): string => {
        return track.requestedBy
            ? `<@${track.requestedBy.id}>`
            : translator('musicPlayerCommon.unavailableRequestedBy');
    };

    protected getDisplayQueueProgressBar(queue: GuildQueue, translator: Translator): string {
        const timestamp: PlayerTimestamp = queue.node.getTimestamp()!;
        let progressBar: string = `**\`${timestamp.current.label}\`** ${queue.node.createProgressBar({
            queue: false,
            length: this.playerOptions.progressBar.length ?? 12,
            timecodes: this.playerOptions.progressBar.timecodes ?? false,
            indicator: this.playerOptions.progressBar.indicator ?? '🔘',
            leftChar: this.playerOptions.progressBar.leftChar ?? '▬',
            rightChar: this.playerOptions.progressBar.rightChar ?? '▬'
        })} **\`${timestamp.total.label}\`**`;

        if (Number(queue.currentTrack?.raw.duration) === 0 || queue.currentTrack?.duration === '0:00') {
            progressBar = translator('musicPlayerCommon.unavailableDuration');
        }

        if (queue.currentTrack?.raw.live) {
            progressBar = translator('musicPlayerCommon.playingLive', {
                icon: this.embedOptions.icons.liveTrack
            });
        }

        return progressBar;
    }

    abstract execute(
        params: BaseInteractionParams
    ): Promise<Message<boolean> | ApplicationCommandOptionChoiceData | void>;
}
