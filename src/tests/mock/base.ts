import { BaseSlashCommandInteraction } from '../../common/classes/interactions';
import { ExtendedClient } from '../../types/clientTypes';

export function createMockInteraction<T>(name: string = 'test'): T {
    return {
        commandName: name,
        reply: jest.fn(),
        editReply: jest.fn(),
        deferReply: jest.fn()
    } as unknown as T;
}

export function createMockClient() {
    return {
        slashCommandInteractions: new Map<string, BaseSlashCommandInteraction>()
    } as unknown as ExtendedClient;
}
