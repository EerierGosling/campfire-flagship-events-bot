import type { Express } from 'express';
import { activeHuddle } from '../slack/huddleInfo';
import { prisma } from '../util/prisma';

export function registerRoutes(app: Express) {
    app.get('/huddle', async (req, res) => {
        const huddle = await activeHuddle();

        if (!huddle) {
            res.json({
                active: false,
                members: [],
                memberCount: 0
            });
            return;
        }

        res.json({
            active: true,
            callId: huddle.call_id,
            members: huddle.active_members,
            memberCount: huddle.active_members.length,
            startedAt: new Date(huddle.start_date * 1000).toISOString()
        });
    });

    app.get('/event', async (req, res) => {
        const activeEvent = await prisma.event.findFirst({
            where: { active: true }
        });

        res.json({
            running: !!activeEvent,
            event: activeEvent ? {
                name: activeEvent.name,
                startedAt: activeEvent.createdAt
            } : null
        });
    });
}
