import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import type { Schema } from "../../../../../scripts/schema-model";
import { childRecords } from "../../../../lib/schema-tree";

const schemas = import.meta.glob("../../../../data/schema/*.json", {
  import: "default",
  eager: true,
}) as unknown as Record<string, Schema>;

export async function getStaticPaths() {
  return (await getCollection("messages")).flatMap((m) =>
    Object.keys(
      schemas[`../../../../data/schema/${m.id}.json`]!.complexTypes,
    ).map((type) => ({ params: { id: m.id, type } })),
  );
}

export const GET: APIRoute = ({ params }) =>
  Response.json(
    childRecords(
      schemas[`../../../../data/schema/${params.id}.json`]!,
      params.type!,
    ),
  );
