import { z } from "zod";

export const CovenantOperatorSchema = z.enum(["<=", ">="]);

export const CovenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  operator: CovenantOperatorSchema,
  threshold: z.number(),
  actualBase: z.number(),
  actualStress: z.number(),
  testFrequency: z.string(),
});

export const ObligationSchema = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: z.string(),
  owner: z.string(),
  status: z.enum(["Pending", "Planned", "Completed"]),
});

export const ServicingPayloadSchema = z.object({
  loanId: z.string(),
  covenants: z.array(CovenantSchema),
  obligations: z.array(ObligationSchema),
});
