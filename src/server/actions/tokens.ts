"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

const CreateTokenInput = z.object({
  name: z.string().min(1).max(60),
  scopes: z.array(z.string()).default([]),
  expiresAt: z.string().nullish(),
});

export async function createApiToken(raw: z.infer<typeof CreateTokenInput>) {
  const user = await requireUser();
  const data = CreateTokenInput.parse(raw);
  const plain = `chk_${randomBytes(24).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(plain).digest("hex");
  await db.apiToken.create({
    data: {
      userId: user.id,
      name: data.name,
      tokenHash,
      scopes: data.scopes,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });
  revalidatePath("/settings/api-tokens");
  // Plaintext returned ONCE. We never store it.
  return plain;
}

export async function deleteApiToken(id: string) {
  const user = await requireUser();
  await db.apiToken.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/settings/api-tokens");
}

export async function verifyBearer(headerValue: string | null): Promise<{ userId: string; scopes: string[] } | null> {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const tokenHash = createHash("sha256").update(match[1]!).digest("hex");
  const token = await db.apiToken.findUnique({ where: { tokenHash } });
  if (!token) return null;
  if (token.expiresAt && token.expiresAt < new Date()) return null;
  await db.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  return { userId: token.userId, scopes: token.scopes };
}
