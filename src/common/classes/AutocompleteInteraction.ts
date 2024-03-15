import { Logger } from 'pino';
import { AutocompleteInteraction } from 'discord.js';
import { BaseAutocompleteParams, BaseAutocompleteReturnType } from '../../types/interactionTypes';
import { BaseInteraction } from './base/BaseInteraction';

export abstract class BaseAutocompleteInteraction extends BaseInteraction {
    name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }

    protected getLogger(name: string, executionId: string, interaction: AutocompleteInteraction): Logger {
        return super.getLoggerBase('autocompleteInteraction', name, executionId, interaction);
    }

    abstract execute(params: BaseAutocompleteParams): BaseAutocompleteReturnType;
}
