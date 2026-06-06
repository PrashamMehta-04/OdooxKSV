import prisma from './prisma';

export async function logActivity(
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  details?: string
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        entityType,
        entityId,
        action,
        details: details || null,
      },
    });
  } catch (err) {
    // Never let logging crash the main flow
    console.error('[logActivity] Failed to write activity log:', err);
  }
}
