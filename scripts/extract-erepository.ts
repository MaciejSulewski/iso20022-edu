// Extracts the definitions one ISO 20022 message reaches from the (git-ignored, 113 MB) eRepository XMI
// into a small committed JSON. Streams lines, parses only the entries it needs. Unknown reachable
// constructs throw, naming the entry (unreachable entries are ignored).
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";
import { XMLParser } from "fast-xml-parser";

export interface Def {
  definition?: string;
}
export interface Defs {
  id: string;
  message: { name: string; definition?: string };
  constraints: { name: string; definition?: string }[];
  types: Record<
    string,
    { definition?: string; elements: Record<string, { name: string } & Def> }
  >;
  simpleTypes: Record<string, Def>;
  codeSets: Record<
    string,
    { definition?: string; codes: Record<string, { name: string } & Def> }
  >;
}

type Attrs = Record<string, string | undefined>;
type Raw = Record<string, unknown>;
interface Entry {
  type: string;
  name: string;
  text: string;
}

// ExternalSchema is the xs:any envelope (SupplementaryDataEnvelope1): a component with no elements.
const COMPONENTS = new Set([
  "MessageComponent",
  "ChoiceComponent",
  "ExternalSchema",
]);
// ISO data types a message element's simpleType may point to (CodeSet is handled separately).
const SIMPLE = new Set([
  "Text",
  "Amount",
  "IdentifierSet",
  "Indicator",
  "Date",
  "DateTime",
  "Time",
  "Year",
  "Month",
  "YearMonth",
  "Quantity",
  "Rate",
  "Binary",
]);
const KEPT = new Set([...COMPONENTS, ...SIMPLE, "CodeSet"]);

const fail = (msg: string): never => {
  throw new Error(`extract-erepository: ${msg}`);
};
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  isArray: (n) =>
    ["messageElement", "code", "constraint", "messageBuildingBlock"].includes(
      n,
    ),
});
const parse = (text: string): Raw => {
  const root = parser.parse(text) as Raw;
  return root[Object.keys(root)[0]!] as Raw;
};
const attrs = (n: Raw): Attrs => {
  const a: Attrs = {};
  for (const [k, v] of Object.entries(n))
    if (k.startsWith("@_"))
      a[k.slice(2)] = String(v)
        .replace(/&#x([0-9a-f]+);/gi, (_, h: string) =>
          String.fromCodePoint(parseInt(h, 16)),
        )
        .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
        .replace(/\r\n?/g, "\n");
  return a;
};
const kids = (n: Raw, k: string) => (n[k] ?? []) as Raw[];
const def = (a: Attrs): Def =>
  a["definition"] === undefined ? {} : { definition: a["definition"] };
const sorted = <T>(o: Record<string, T>) =>
  Object.fromEntries(
    Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );

export async function extractDefs(
  lines: Iterable<string> | AsyncIterable<string>,
  id: string,
): Promise<Defs> {
  const [area, func, flavour, version] = id.split(".");
  const ident = (l: string) =>
    l.includes("<messageDefinitionIdentifier ") &&
    l.includes(`businessArea="${area}"`) &&
    l.includes(`messageFunctionality="${func}"`) &&
    l.includes(`flavour="${flavour}"`) &&
    l.includes(`version="${version}"`);

  // Pass over the file once: index dictionary entries by xmi:id, keep the wanted message block.
  const index = new Map<string, Entry>();
  const messages: string[] = [];
  let block: string[] | null = null;
  let closer = "";
  let isMsg = false;
  let matches = false;
  for await (const raw of lines) {
    const line = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw; // strip BOM
    const t = line.trim();
    if (!block) {
      const dict = t.startsWith("<topLevelDictionaryEntry ");
      if (!dict && !t.startsWith("<messageDefinition ")) continue;
      if (!t.endsWith(">"))
        fail(`opening tag spans several lines: ${t.slice(0, 80)}`);
      isMsg = !dict;
      closer = dict ? "</topLevelDictionaryEntry>" : "</messageDefinition>";
      block = [];
      matches = false;
      if (t.endsWith("/>")) {
        block = null;
        if (dict) add(index, [line]);
        continue;
      }
    }
    block.push(line);
    if (isMsg && ident(line)) matches = true;
    if (t === closer) {
      if (isMsg) {
        if (matches) messages.push(block.join("\n"));
      } else add(index, block);
      block = null;
    }
  }
  if (messages.length !== 1)
    fail(`${messages.length} message definitions found for ${id}, expected 1`);

  const msg = parse(messages[0]!);
  const m = attrs(msg);
  const out: Defs = {
    id,
    message: { name: m["name"]!, ...def(m) },
    constraints: kids(msg, "constraint").map((c) => {
      const a = attrs(c);
      return { name: a["name"]!, ...def(a) };
    }),
    types: {},
    simpleTypes: {},
    codeSets: {},
  };

  const lookup = (ref: string, from: string): Entry =>
    index.get(ref) ?? fail(`unknown reference "${ref}" from ${from}`);
  const typeIds = new Map<string, string>(); // name -> xmi:id, to catch two reachable entries with one name
  const claim = (name: string, xmi: string) => {
    if (typeIds.get(name) !== undefined && typeIds.get(name) !== xmi)
      fail(`two reachable entries are named "${name}"`);
    typeIds.set(name, xmi);
  };

  const elements = (name: string, parts: Raw[]) => {
    const els: Record<string, { name: string } & Def> = {};
    for (const p of parts) {
      const a = attrs(p);
      const kind = a["xsi:type"];
      const where = `${name}/${a["name"]}`;
      const tag = a["xmlTag"] ?? fail(`no xmlTag on ${where}`);
      if (tag in els) fail(`duplicate element "${tag}" in ${name}`);
      els[tag] = { name: a["name"]!, ...def(a) };
      if (kind === "iso20022:MessageAssociationEnd")
        component(a["type"] ?? fail(`no type on ${where}`), where);
      else if (kind === "iso20022:MessageAttribute" || kind === undefined) {
        if (a["complexType"]) component(a["complexType"], where);
        else simple(a["simpleType"] ?? fail(`no type on ${where}`), where);
      } else fail(`unsupported xsi:type "${kind}" on ${where}`);
    }
    return els;
  };

  const component = (ref: string, from: string) => {
    const e = lookup(ref, from);
    if (!COMPONENTS.has(e.type.replace("iso20022:", "")))
      fail(
        `unsupported xsi:type "${e.type}" on "${e.name}" (${ref}), reached from ${from}`,
      );
    claim(e.name, ref);
    if (out.types[e.name]) return;
    const node = parse(e.text);
    out.types[e.name] = { ...def(attrs(node)), elements: {} }; // placeholder first: breaks cycles
    out.types[e.name]!.elements = elements(
      e.name,
      kids(node, "messageElement"),
    );
  };

  const simple = (ref: string, from: string) => {
    const e = lookup(ref, from);
    const type = e.type.replace("iso20022:", "");
    if (!SIMPLE.has(type) && type !== "CodeSet")
      fail(
        `unsupported xsi:type "${e.type}" on "${e.name}" (${ref}), reached from ${from}`,
      );
    claim(e.name, ref);
    const node = parse(e.text);
    if (type !== "CodeSet") {
      out.simpleTypes[e.name] = def(attrs(node));
      return;
    }
    // A derived set (trace) lists code names only; the code value and definition live in the traced set.
    const a = attrs(node);
    const base = a["trace"]
      ? parse(lookup(a["trace"], e.name).text)
      : undefined;
    const baseCodes = base ? kids(base, "code").map(attrs) : [];
    const codes: Record<string, { name: string } & Def> = {};
    for (const c of kids(node, "code").map(attrs)) {
      const twin = baseCodes.find((b) => b["name"] === c["name"]);
      const value = c["codeName"] ?? twin?.["codeName"];
      if (!value)
        fail(`code "${c["name"]}" of ${e.name} (${ref}) has no code value`);
      codes[value!] = {
        name: c["name"]!,
        ...def(c["definition"] ? c : (twin ?? c)),
      };
    }
    out.codeSets[e.name] = { ...def(a), codes: sorted(codes) };
  };

  const blocks = kids(msg, "messageBuildingBlock");
  for (const b of blocks)
    component(
      attrs(b)["complexType"] ??
        fail(`no complexType on ${m["name"]}/${attrs(b)["name"]}`),
      m["name"]!,
    );
  out.types[m["name"]!] = { ...def(m), elements: elements(m["name"]!, blocks) };

  out.types = sorted(out.types);
  out.simpleTypes = sorted(out.simpleTypes);
  out.codeSets = sorted(out.codeSets);
  return out;
}

function add(index: Map<string, Entry>, block: string[]) {
  const head = block[0]!;
  const get = (k: string) => new RegExp(` ${k}="([^"]*)"`).exec(head)?.[1];
  const xmi = get("xmi:id");
  const type = get("xsi:type");
  const name = get("name");
  if (!xmi || !type || !name)
    fail(`entry without id, type or name: ${head.trim().slice(0, 120)}`);
  const kept = KEPT.has(type!.replace("iso20022:", ""));
  index.set(xmi!, {
    type: type!,
    name: name!,
    text: kept ? block.join("\n") : "",
  });
}

if (import.meta.main) {
  const [file, id, out = `src/data/erepository/${id}.defs.json`] =
    process.argv.slice(2);
  if (!file || !id) {
    console.error(
      "usage: node scripts/extract-erepository.ts <erepository-file> <e.g. pacs.008.001.14> [out]",
    );
    process.exit(1);
  }
  const lines = createInterface({
    input: createReadStream(file, "utf8"),
    crlfDelay: Infinity,
  });
  const defs = await extractDefs(lines, id);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(defs, null, 2) + "\n");
  console.log(`wrote ${out}`);
}
