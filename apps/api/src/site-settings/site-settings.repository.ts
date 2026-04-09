import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

const SITE_SETTINGS_SINGLETON_ID = 1;

export const SITE_SETTINGS_REPOSITORY = "SITE_SETTINGS_REPOSITORY";

export interface SiteSettingsRepository {
  load(): Promise<Record<string, unknown> | null>;
  save(data: Record<string, unknown>): Promise<void>;
}

@Injectable()
export class PrismaSiteSettingsRepository implements SiteSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(): Promise<Record<string, unknown> | null> {
    const row = await this.prisma.siteSettings.findUnique({
      where: { id: SITE_SETTINGS_SINGLETON_ID }
    });
    return (row?.data as Record<string, unknown> | null) ?? null;
  }

  async save(data: Record<string, unknown>): Promise<void> {
    await this.prisma.siteSettings.upsert({
      where: { id: SITE_SETTINGS_SINGLETON_ID },
      create: { id: SITE_SETTINGS_SINGLETON_ID, data: data as unknown as any },
      update: { data: data as unknown as any }
    });
  }
}

@Injectable()
export class MemorySiteSettingsRepository implements SiteSettingsRepository {
  private snapshot: Record<string, unknown> | null = null;

  async load(): Promise<Record<string, unknown> | null> {
    return this.snapshot;
  }

  async save(data: Record<string, unknown>): Promise<void> {
    this.snapshot = structuredClone(data);
  }
}

