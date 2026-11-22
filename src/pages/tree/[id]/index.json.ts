import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import type { Schema } from "../../../../scripts/schema-model";
import { searchIndex } from "../../../lib/schema-tree";

const schemas = import.meta.glob("../../../data/schema/*.json", {
  import: "default",
  eager: true,
}) as unknown as Record<string, Schema>;

export async function getStaticPaths() {
  return (await getCollection("messages")).map((m) => ({
    params: { id: m.id },
  }));
}

export const GET: APIRoute = ({ params }) =>
  Response.json(
    searchIndex(schemas[`../../../data/schema/${params.id}.json`]!),
  );
