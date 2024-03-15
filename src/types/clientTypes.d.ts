import { Client, Collection } from 'discord.js';
import { BaseSlashCommandInteraction } from '../common/classes/SlashCommandInteraction';
import { BaseAutocompleteInteraction } from '../common/classes/AutocompleteInteraction';
import { BaseComponentInteraction } from '../common/classes/ComponentInteraction';

type RegisterClientInteractionsFunction = (params: { client: Client; executionId: string }) => void;

export type ExtendedClient = {
    registerClientInteractions?: RegisterClientInteractionsFunction;
    slashCommandInteractions?: Collection<string, BaseSlashCommandInteraction>;
    autocompleteInteractions?: Collection<string, BaseAutocompleteInteraction>;
    componentInteractions?: Collection<string, BaseComponentInteraction>;
} & Client;
