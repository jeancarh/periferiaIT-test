import type { ZodError } from "zod"

export const describirErrorZod = (error: ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "entrada"}: ${issue.message}`)
    .join("; ")
