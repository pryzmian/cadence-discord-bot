import { GuildQueue } from 'discord-player';
import { ChatInputCommandInteraction, EmbedAuthorOptions, GuildMember, MessageComponentInteraction } from 'discord.js';
import { Translator } from '../../utils/localeUtil';
import { BaseInteraction } from './BaseInteraction';

export abstract class BaseInteractionWithEmbedResponse extends BaseInteraction {
    constructor() {
        super();
    }

    protected getEmbedUserAuthor(
        interaction: MessageComponentInteraction | ChatInputCommandInteraction
    ): EmbedAuthorOptions {
        let authorName: string = '';
        if (interaction.member instanceof GuildMember) {
            authorName = interaction.member.nickname || interaction.user.username;
        } else {
            authorName = interaction.user.username;
        }

        return {
            name: authorName,
            iconURL: interaction.user.avatarURL() || this.embedOptions.info.fallbackIconUrl
        };
    }

    protected getEmbedQueueAuthor(
        interaction: MessageComponentInteraction | ChatInputCommandInteraction,
        queue: GuildQueue,
        translator: Translator
    ): EmbedAuthorOptions {
        const bitrate = queue.channel ? queue.channel.bitrate / 1000 : 0;
        return {
            name: translator('musicPlayerCommon.voiceChannelInfo', {
                channel: queue.channel!.name,
                bitrate
            }),
            iconURL: interaction.guild!.iconURL() || this.embedOptions.info.fallbackIconUrl
        };
    }
}
