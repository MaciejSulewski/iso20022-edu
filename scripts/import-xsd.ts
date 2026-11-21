// Turns an ISO 20022 message XSD into the generated schema JSON (Project Plan section 3).
// Anything the importer does not model throws, naming the construct and the type it is in.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { XMLParser } from "fast-xml-parser";
import { SchemaModel, type Schema } from "./schema-model.ts";

interface Node {
  name: string;
  attrs: Record<string, string>;
  kids: Node[];
  text: string;
}

// fast-xml-parser preserveOrder output -> plain tree.
function toTree(items: unknown[]): Node[] {
  const out: Node[] = [];
  for (const item of items as Record<string, unknown>[]) {
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(
      (item[":@"] ?? {}) as Record<string, string>,
    )) {
      attrs[k.slice(2)] = String(v);
    }
    const name = Object.keys(item).find((k) => k !== ":@")!;
    if (name === "#text") continue;
    const children = item[name] as unknown[];
    const text = (children as Record<string, unknown>[])
      .filter((c) => "#text" in c)
      .map((c) => String(c["#text"]).trim())
      .filter(Boolean)
      .join(" ");
    out.push({ name, attrs, kids: toTree(children), text });
  }
  return out;
}

const fail = (msg: string): never => {
  throw new Error(`import-xsd: ${msg}`);
};

type ElementEntry = Schema["complexTypes"][string]["elements"][number];

export function importXsd(xsdText: string): Schema {
  const parsed = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    ignoreDeclaration: true,
    parseTagValue: false,
    trimValues: false, // attribute values (codes) must stay verbatim; text is trimmed in toTree
  }).parse(xsdText) as unknown[];
  const rootNode = toTree(parsed).find((n) => n.name.endsWith("schema"));
  if (!rootNode) return fail("no xs:schema root element");
  const p = rootNode.name.slice(0, rootNode.name.length - "schema".length); // "xs:"
  const x = (n: string) => p + n;
  const refs: { type: string; where: string }[] = [];

  // Throws on any attribute / child element not in the allowed lists.
  const check = (n: Node, ctx: string, attrs: string[], kids: string[]) => {
    for (const a of Object.keys(n.attrs)) {
      if (a !== "id" && !attrs.includes(a))
        fail(`unsupported attribute "${a}" on ${n.name} in ${ctx}`);
    }
    for (const k of n.kids) {
      if (!kids.map(x).includes(k.name))
        fail(`unsupported element ${k.name} in ${ctx}`);
    }
  };
  const need = (n: Node, a: string, ctx: string) =>
    n.attrs[a] ?? fail(`${n.name} in ${ctx} has no "${a}" attribute`);
  const one = (n: Node, name: string, ctx: string) => {
    const found = n.kids.filter((k) => k.name === x(name));
    if (found.length > 1) fail(`more than one ${x(name)} in ${ctx}`);
    return found[0];
  };

  // "xs:string" -> "string" (builtin); anything else is a reference to check.
  const typeRef = (t: string, where: string) => {
    if (t.startsWith(p)) return t.slice(p.length);
    refs.push({ type: t, where });
    return t;
  };

  // xs:annotation/xs:documentation -> { isoName, definition }. Accepts
  // <Nm>..</Nm><Dfn>..</Dfn> and "Name = ... Definition = ..." text.
  // No annotation: undefined when optional, a failure when required.
  function docOf(n: Node, label: string, ctx: string, required: boolean) {
    const ann = one(n, "annotation", ctx);
    if (!ann) {
      if (required) fail(`missing ${x("annotation")} on ${label} in ${ctx}`);
      return undefined;
    }
    check(ann, ctx, [], ["documentation"]);
    const d = one(ann, "documentation", ctx);
    if (!d) return fail(`empty ${x("annotation")} on ${label} in ${ctx}`);
    const where = `${x("documentation")} on ${label} in ${ctx}`;
    for (const a of Object.keys(d.attrs))
      fail(`unsupported attribute "${a}" on ${where}`);
    for (const k of d.kids)
      if (k.name !== "Nm" && k.name !== "Dfn")
        fail(`unsupported element ${k.name} in ${where}`);
    const flat = (s: string) => s.replace(/\s+/g, " ").trim();
    const nm = d.kids.find((k) => k.name === "Nm");
    const dfn = d.kids.find((k) => k.name === "Dfn");
    if (nm && dfn) {
      if (d.text) fail(`stray text in ${where}`);
      return { isoName: flat(nm.text), definition: flat(dfn.text) };
    }
    const m =
      /^\s*Name\s*=\s*([\s\S]*?)\s*Definition\s*=\s*([\s\S]*?)\s*$/.exec(
        d.text,
      );
    if (m && !d.kids.length)
      return { isoName: flat(m[1]!), definition: flat(m[2]!) };
    return fail(`unrecognised format of ${where}`);
  }

  const occurs = (n: Node) => {
    const min = Number(n.attrs["minOccurs"] ?? 1);
    const maxRaw = n.attrs["maxOccurs"] ?? "1";
    const max = maxRaw === "unbounded" ? "unbounded" : Number(maxRaw);
    return { min, max } as { min: number; max: number | "unbounded" };
  };

  function complexType(
    n: Node,
    exempt = false,
  ): Schema["complexTypes"][string] {
    const name = need(n, "name", "complexType");
    check(
      n,
      name,
      ["name"],
      ["annotation", "sequence", "choice", "simpleContent"],
    );
    const doc = docOf(n, name, name, !exempt);
    const { isoName, definition } = doc ?? { isoName: name, definition: "" };
    const body = n.kids.filter((k) => k.name !== x("annotation"));
    if (body.length !== 1)
      return fail(
        `${x("complexType")} ${name} needs exactly one content model`,
      );
    const b = body[0]!;
    if (b.name === x("simpleContent")) {
      check(b, name, [], ["extension"]);
      const ext = one(b, "extension", name)!;
      check(ext, name, ["base"], ["attribute"]);
      const attributes = ext.kids.map((a) => {
        check(a, name, ["name", "type", "use"], []);
        const use = a.attrs["use"] ?? "optional";
        if (use !== "required" && use !== "optional")
          fail(`unsupported use="${use}" on ${a.name} in ${name}`);
        return {
          name: need(a, "name", name),
          type: typeRef(
            need(a, "type", name),
            `attribute ${a.attrs["name"]} in ${name}`,
          ),
          required: use === "required",
        };
      });
      return {
        isoName,
        definition,
        elements: [],
        choice: false,
        content: {
          base: typeRef(need(ext, "base", name), `extension in ${name}`),
          attributes,
        },
      };
    }
    check(b, name, [], ["element", "any"]);
    const elements: ElementEntry[] = b.kids.map((k) => {
      if (k.name === x("any")) {
        check(
          k,
          name,
          ["minOccurs", "maxOccurs", "namespace", "processContents"],
          [],
        );
        return { any: true as const, ...occurs(k) };
      }
      check(
        k,
        name,
        ["name", "type", "minOccurs", "maxOccurs"],
        ["annotation"],
      );
      const tag = need(k, "name", name);
      return {
        tag,
        ...(docOf(k, tag, name, !exempt) ?? { isoName: tag, definition: "" }),
        type: typeRef(need(k, "type", name), `element ${tag} in ${name}`),
        ...occurs(k),
      };
    });
    return { isoName, definition, elements, choice: b.name === x("choice") };
  }

  function simpleType(n: Node): Schema["simpleTypes"][string] {
    const name = need(n, "name", "simpleType");
    check(n, name, ["name"], ["annotation", "restriction"]);
    const r = one(n, "restriction", name) ?? fail(`${name} has no restriction`);
    check(
      r,
      name,
      ["base"],
      [
        "minLength",
        "maxLength",
        "pattern",
        "enumeration",
        "totalDigits",
        "fractionDigits",
        "minInclusive",
      ],
    );
    const doc = docOf(n, name, name, false);
    const out: Schema["simpleTypes"][string] = {
      ...(doc && { definition: doc.definition }),
      base: typeRef(need(r, "base", name), `restriction in ${name}`),
    };
    const seen = new Set<string>();
    for (const f of r.kids) {
      check(f, name, ["value"], []);
      const v = need(f, "value", name);
      const facet = f.name.slice(p.length);
      if (facet === "enumeration") {
        (out.codes ??= []).push(v);
        continue;
      }
      if (seen.has(facet)) fail(`repeated ${f.name} in ${name}`);
      seen.add(facet);
      if (facet === "pattern") out.pattern = v;
      else if (facet === "minInclusive") out.minInclusive = v;
      else (out as Record<string, unknown>)[facet] = Number(v);
    }
    return out;
  }

  const complexTypes: Schema["complexTypes"] = {};
  const simpleTypes: Schema["simpleTypes"] = {};
  const names = new Set<string>();
  const unique = (name: string) => {
    if (names.has(name)) fail(`duplicate type name "${name}"`);
    names.add(name);
  };
  const targetNs = rootNode.attrs["targetNamespace"] ?? "";
  for (const a of Object.keys(rootNode.attrs)) {
    if (!/^(xmlns(:.+)?|targetNamespace|elementFormDefault)$/.test(a))
      fail(`unsupported attribute "${a}" on ${rootNode.name}`);
  }
  for (const n of rootNode.kids) {
    if (n.name === x("complexType")) {
      const name = need(n, "name", "complexType");
      if (name === "Document") continue;
      unique(name);
      complexTypes[name] = complexType(n);
    } else if (n.name === x("simpleType")) {
      const name = need(n, "name", "simpleType");
      unique(name);
      simpleTypes[name] = simpleType(n);
    } else if (n.name === x("element")) {
      check(n, "schema", ["name", "type"], []);
      if (n.attrs["name"] !== "Document" || n.attrs["type"] !== "Document")
        fail(`unsupported top-level ${n.name} ${n.attrs["name"]}`);
    } else {
      fail(`unsupported element ${n.name} in schema`);
    }
  }

  // Document wraps exactly one element: the message root.
  const docType = rootNode.kids.find(
    (n) => n.name === x("complexType") && n.attrs["name"] === "Document",
  );
  if (!docType) return fail("no Document complexType");
  const docDef = complexType(docType, true);
  if (docDef.elements.length !== 1 || !("tag" in docDef.elements[0]!))
    return fail("Document must contain exactly one element");
  const root = docDef.elements[0].tag;

  const id = /(?:^|:)([a-z]+\.\d{3}\.\d{3}\.\d{2})$/.exec(targetNs)?.[1];
  if (!id)
    return fail(`cannot read message id from targetNamespace "${targetNs}"`);

  for (const r of refs) {
    if (!(r.type in complexTypes) && !(r.type in simpleTypes))
      fail(`unknown type "${r.type}" referenced by ${r.where}`);
  }
  return SchemaModel.parse({ id, root, complexTypes, simpleTypes });
}

if (import.meta.main) {
  const [xsdPath, outDir = "src/data/schema"] = process.argv.slice(2);
  if (!xsdPath) {
    console.error("usage: node scripts/import-xsd.ts <xsd-path> [out-dir]");
    process.exit(1);
  }
  const schema = importXsd(readFileSync(xsdPath, "utf8"));
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${schema.id}.json`);
  writeFileSync(out, JSON.stringify(schema, null, 2) + "\n");
  console.log(`wrote ${out}`);
}
