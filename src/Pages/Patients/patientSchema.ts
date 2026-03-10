import { z } from 'zod'

export const patientSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  internalId: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  sex: z.union([z.number(), z.string()]).optional().nullable(),
  wardOfAdmissionId: z.union([z.number(), z.string()]).optional().nullable(),
  bsiOnset: z.union([z.number(), z.string()]).optional().nullable(),
  bsiDiagnosisDate: z.string().optional().nullable(),
  sofaScore: z.union([z.number(), z.string()]).optional().nullable(),
  charlsonComorbidityIndex: z.union([z.number(), z.string()]).optional().nullable(),
  rectalColonizationStatus: z.union([z.number(), z.string()]).optional().nullable(),
  rectalColonizationPathogenId: z.union([z.number(), z.string()]).optional().nullable(),
  monoPoliMicrobial: z.union([z.number(), z.string()]).optional().nullable(),
  combinationTherapy: z.union([z.number(), z.string()]).optional().nullable(),
  dateTargetedTherapy: z.string().optional().nullable(),
  timeToAppropriateTherapy: z.union([z.number(), z.string()]).optional().nullable(),
  outcome: z.union([z.number(), z.string()]).optional().nullable(),
})

export type PatientFormData = z.infer<typeof patientSchema>
