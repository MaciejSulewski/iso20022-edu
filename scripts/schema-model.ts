// Shape of the generated schema (Project Plan section 3). Shared by import-xsd and later checks.
import { z } from "zod";

const multiplicity = z.union([z.number().int().min(0), z.literal("unbounded")]);

export const ElementSchema = z.union([
  z.strictObject({
    tag: z.string(),
    isoName: z.string(),
    type: z.string(),
    min: z.number().int().min(0),
    max: multiplicity,
    definition: z.string(),
  }),
  // xs:any (SupplementaryData envelope): modelled, not skipped.
  z.strictObject({
    any: z.literal(true),
    min: z.number().int().min(0),
    max: multiplicity,
  }),
]);

export const ComplexTypeSchema = z.strictObject({
  isoName: z.string(),
  definition: z.string(),
  elements: z.array(ElementSchema),
  choice: z.boolean(),
  // simpleContent extension, e.g. an amount with a currency attribute.
  content: z
    .strictObject({
      base: z.string(),
      attributes: z.array(
        z.strictObject({
          name: z.string(),
          type: z.string(),
          required: z.boolean(),
        }),
      ),
    })
    .optional(),
});

export const SimpleTypeSchema = z.strictObject({
  definition: z.string().optional(),
  base: z.string(),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  pattern: z.string().optional(),
  // Plain enumeration values, or code + name + definition when a code set is known.
  codes: z
    .array(
      z.union([
        z.string(),
        z.strictObject({
          code: z.string(),
          name: z.string(),
          definition: z.string(),
        }),
      ]),
    )
    .optional(),
  totalDigits: z.number().int().optional(),
  fractionDigits: z.number().int().optional(),
  minInclusive: z.string().optional(),
});

export const SchemaModel = z.strictObject({
  id: z.string(),
  root: z.string(),
  // Business rules from the eRepository (name and definition only).
  constraints: z
    .array(z.strictObject({ name: z.string(), definition: z.string() }))
    .optional(),
  complexTypes: z.record(z.string(), ComplexTypeSchema),
  simpleTypes: z.record(z.string(), SimpleTypeSchema),
});

export type Schema = z.infer<typeof SchemaModel>;

// Input shape of src/data/erepository/<id>.defs.json (written by extract-erepository).
const named = z.object({ name: z.string(), definition: z.string() });
export const DefsModel = z.object({
  id: z.string(),
  message: named,
  constraints: z.array(named),
  types: z.record(
    z.string(),
    z.object({
      definition: z.string(),
      elements: z.record(z.string(), named),
    }),
  ),
  simpleTypes: z.record(z.string(), z.object({ definition: z.string() })),
  codeSets: z.record(
    z.string(),
    z.object({
      definition: z.string(),
      codes: z.record(z.string(), named),
    }),
  ),
});
export type Defs = z.infer<typeof DefsModel>;
