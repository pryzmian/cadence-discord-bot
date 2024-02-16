import { handleCommand } from '../../handlers/interactionCommandHandler';
import { ChatInputCommandInteraction } from 'discord.js';
import { BaseSlashCommandInteraction } from '../../common/classes/interactions';
import { ExtendedClient } from '../../types/clientTypes';
import { checkChannelPermissionViewable } from '../../common/validation/permissionValidator';
import { loggerService } from '../../common/services/logger';
import { createMockClient, createMockInteraction } from '../mock/base';

jest.mock('../../common/validation/permissionValidator');
jest.mock('../../common/services/logger', () => ({
    loggerService: {
        child: jest.fn().mockReturnThis(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

describe('interactionCommandHandler', () => {
    let mockInteraction: ChatInputCommandInteraction;
    let client: ExtendedClient;
    let executionId: string;
    let interactionIdentifier: string;

    beforeEach(() => {
        mockInteraction = createMockInteraction();
        client = createMockClient();
        executionId = '123';
        interactionIdentifier = 'testCommand';
    });

    it('should handle command correctly when slash command is found', async () => {
        const mockSlashCommand = {
            execute: jest.fn()
        } as unknown as BaseSlashCommandInteraction;

        client.slashCommandInteractions?.set(interactionIdentifier, mockSlashCommand);

        await handleCommand(mockInteraction, client, executionId, interactionIdentifier);

        expect(checkChannelPermissionViewable).toHaveBeenCalledWith({ interaction: mockInteraction, executionId });
        expect(mockSlashCommand.execute).toHaveBeenCalledWith({ interaction: mockInteraction, client, executionId });
    });

    it('should handle command correctly when slash command is not found', async () => {
        const loggerSpy = jest.spyOn(
            loggerService.child({ module: 'handler', name: 'interactionCommandHandler', executionId: executionId }),
            'warn'
        );

        await handleCommand(mockInteraction, client, executionId, interactionIdentifier);

        expect(checkChannelPermissionViewable).toHaveBeenCalledWith({ interaction: mockInteraction, executionId });
        expect(loggerSpy).toHaveBeenCalledWith(
            `Interaction created but slash command '${interactionIdentifier}' was not found.`
        );
    });
});
