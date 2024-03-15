import { MessageComponentInteraction } from 'discord.js';
import { Logger } from 'pino';
import { BaseComponentParams, BaseComponentReturnType } from '../../types/interactionTypes';
import { BaseInteractionWithEmbedResponse } from './base/BaseInteractionWithEmbedResponse';

export abstract class BaseComponentInteraction extends BaseInteractionWithEmbedResponse {
    name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }

    protected getLogger(name: string, executionId: string, interaction: MessageComponentInteraction): Logger {
        return super.getLoggerBase('componentInteraction', name, executionId, interaction);
    }

    abstract execute(params: BaseComponentParams): BaseComponentReturnType;
}
