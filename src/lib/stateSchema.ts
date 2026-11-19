import { z } from "zod";
import { assumptionsSchema, expensesSchema, profileSchema } from "./assistant/schema";

/** The part of the app state that syncs to the user's account. Chat history stays on the device. */
export const syncedStateSchema = z.object({
  onboarded: z.boolean(),
  profile: profileSchema.extend({ name: z.string().trim().max(60) }),
  expenses: expensesSchema,
  assumptions: assumptionsSchema,
  history: z.array(z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    income: z.number().finite(),
    expenses: z.number().finite(),
    savings: z.number().finite(),
    invested: z.number().finite(),
    netWorth: z.number().finite(),
  })).max(600),
});

export type SyncedState = z.infer<typeof syncedStateSchema>;

export const credentialsSchema = z.object({
  email: z.string().trim().max(254).email("Enter a valid email address."),
  password: z.string().max(128, "Password is too long."),
});

export const newPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Password is too long.")
  .refine((p) => new Set(p).size >= 4, "Password is too simple.");
