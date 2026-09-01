import { z } from "zod";

/** Empty-string form input -> null, so optional `date` columns don't get an invalid "" value. */
export const blankToNull = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? null : val),
  z.string().nullable().optional(),
);

/** Empty-string form input -> null, so optional `numeric` columns don't get an invalid "" value. */
export const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
  z.number().nullable().optional(),
);
