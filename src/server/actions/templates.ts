"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth-helpers";
import { db } from "@/server/db";

const UpdateTemplateInput = z.object({
  name: z.string().min(1),
  typstSource: z.string().min(1),
});

/**
 * Persist edited Typst source for a template, bumping its version and keeping a
 * TemplateVersion history row.
 */
export async function updateTemplate(raw: z.infer<typeof UpdateTemplateInput>) {
  await requireUser();
  const { name, typstSource } = UpdateTemplateInput.parse(raw);
  const tpl = await db.template.findUnique({ where: { name } });
  if (!tpl) throw new Error(`Template not found: ${name}`);

  const nextVersion = tpl.version + 1;
  await db.$transaction([
    db.templateVersion.create({
      data: {
        templateId: tpl.id,
        typstSource: tpl.typstSource,
        meta: tpl.meta as object,
        version: tpl.version,
      },
    }),
    db.template.update({
      where: { id: tpl.id },
      data: { typstSource, version: nextVersion },
    }),
  ]);

  revalidatePath(`/templates/${name}`);
  revalidatePath("/templates");
  return { version: nextVersion };
}
