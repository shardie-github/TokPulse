import { prisma } from '@tokpulse/db';
import { telemetry } from '@tokpulse/shared';
export async function trackEvent(event) {
    try {
        const store = await prisma.store.findUnique({
            where: { shopDomain: event.shop },
        });
        if (!store) {
            throw new Error('Store not found');
        }
        // Store pixel event
        await prisma.pixelEvent.create({
            data: {
                eventType: event.event,
                eventData: event.properties,
                storeId: store.id,
            },
        });
        // Track via telemetry
        telemetry.log({
            event: event.event,
            properties: event.properties,
            timestamp: Date.now(),
            organizationId: store.organizationId,
            storeId: store.id,
            userId: event.userId,
        });
        return { success: true };
    }
    catch (error) {
        telemetry.error(error, {
            event: event.event,
            shop: event.shop,
        });
        throw error;
    }
}
