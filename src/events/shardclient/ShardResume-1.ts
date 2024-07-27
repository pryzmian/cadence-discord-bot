import { ShardEvents } from '@type/IEventHandler';
import type { IEventHandler } from '@type/IEventHandler';
import type { ILoggerService } from '@services/_types/insights/ILoggerService';
import type { IShardClient } from '@core/_types/IShardClient';

export class ShardResumeEventHandler implements IEventHandler {
    public eventName = ShardEvents.ShardResume;
    public triggerOnce = false;

    public handleEvent(logger: ILoggerService, _shardClient: IShardClient, shardId: number) {
        logger.info(`Event '${this.eventName}' received: Shard with ID ${shardId} has resumed.`);
    }
}

module.exports = new ShardResumeEventHandler();