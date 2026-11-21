// Fixtures are synthetic, hand-written XMI snippets with invented names (not ISO text).
import assert from "node:assert/strict";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { test } from "node:test";
import { XMLParser } from "fast-xml-parser";
import { extractDefs } from "./extract-erepository.ts";

const T = "xsi:type";
const mc = (id: string, name: string, def: string, body = "") =>
  `    <topLevelDictionaryEntry ${T}="iso20022:MessageComponent" xmi:id="${id}" name="${name}" definition="${def}" registrationStatus="Registered">
${body}
    </topLevelDictionaryEntry>`;
const attr = (name: string, tag: string, simple: string, def = "An item.") =>
  `      <messageElement ${T}="iso20022:MessageAttribute" xmi:id="e-${name}" name="${name}" definition="${def}" maxOccurs="1" minOccurs="1" xmlTag="${tag}" isDerived="false" simpleType="${simple}"/>`;
const assoc = (name: string, tag: string, type: string) =>
  `      <messageElement ${T}="iso20022:MessageAssociationEnd" xmi:id="e-${name}" name="${name}" definition="Link ${name}." maxOccurs="1" minOccurs="0" xmlTag="${tag}" isDerived="false" isComposite="true" type="${type}"/>`;
const text = (id: string, name: string) =>
  `    <topLevelDictionaryEntry ${T}="iso20022:Text" xmi:id="${id}" name="${name}" definition="Short text." registrationStatus="Registered" maxLength="35"/>`;
const msg = (
  ident = `businessArea="fake" messageFunctionality="001" flavour="001" version="01"`,
  name = "FakeMessageV01",
) => `      <messageDefinition xmi:id="m-${name}" name="${name}" definition="Scope&#xD;&#xA;A fake message.">
        <semanticMarkup xmi:id="s1" type="projectName"/>
        <constraint xmi:id="k1" name="FakeRule" definition="If A then B." registrationStatus="Registered" expression="&lt;x/&gt;"/>
        <constraint xmi:id="k2" name="BareRule" registrationStatus="Registered"/>
        <messageBuildingBlock xmi:id="b1" name="Header" definition="The header." maxOccurs="1" minOccurs="1" xmlTag="Hdr" complexType="c1"/>
        <messageDefinitionIdentifier ${ident}/>
      </messageDefinition>`;

const REPO = (entries: string[], messages: string[]) =>
  `<?xml version="1.0" encoding="utf-8"?>
<iso20022:Repository xmlns:iso20022="urn:x" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dataDictionary xmi:id="dd">
${entries.join("\n")}
  </dataDictionary>
  <businessProcessCatalogue xmi:id="bp">
    <topLevelCatalogueEntry ${T}="iso20022:BusinessArea" xmi:id="ba" name="Fake">
${messages.join("\n")}
    </topLevelCatalogueEntry>
  </businessProcessCatalogue>
</iso20022:Repository>
`.split("\n");

const CODESET = [
  `    <topLevelDictionaryEntry ${T}="iso20022:CodeSet" xmi:id="cs1" name="FakeType1Code" definition="Derived set." registrationStatus="Registered" trace="cs0">`,
  `      <code xmi:id="x1" name="Alpha" registrationStatus="Provisionally Registered"/>`,
  `    </topLevelDictionaryEntry>`,
  `    <topLevelDictionaryEntry ${T}="iso20022:CodeSet" xmi:id="cs0" name="FakeTypeCode" definition="Base set." registrationStatus="Registered">`,
  `      <code xmi:id="y1" name="Alpha" definition="First one." registrationStatus="Registered" codeName="ALPH"/>`,
  `      <code xmi:id="y2" name="Beta" definition="Never used." registrationStatus="Registered" codeName="BETA"/>`,
  `    </topLevelDictionaryEntry>`,
].join("\n");

const GOOD = () =>
  REPO(
    [
      mc(
        "c1",
        "Header1",
        "A header.&#xD;&#xA;Second line.",
        [
          attr("Ident", "Id", "t1"),
          attr("Kind", "Knd", "cs1"),
          assoc("Child", "Chld", "c2"),
        ].join("\n"),
      ),
      mc(
        "c2",
        "Child1",
        "A child.",
        [assoc("Self", "Slf", "c2"), assoc("Open", "Opn", "x9")].join("\n"),
      ),
      `    <topLevelDictionaryEntry ${T}="iso20022:ExternalSchema" xmi:id="x9" name="Envelope1" definition="Any content." registrationStatus="Registered"/>`,
      mc("c3", "Unreachable1", "Not used.", attr("X", "X", "nowhere")),
      text("t1", "Max35Text"),
      CODESET,
      `    <topLevelDictionaryEntry ${T}="iso20022:BusinessComponent" xmi:id="bc" name="Unused"/>`,
    ],
    [
      msg(),
      msg(
        `businessArea="fake" messageFunctionality="002" flavour="001" version="01"`,
        "OtherV01",
      ),
    ],
  );

test("extracts message, constraints, reachable types, simple types and code sets", async () => {
  const d = await extractDefs(GOOD(), "fake.001.001.01");
  assert.equal(d.id, "fake.001.001.01");
  assert.deepEqual(d.message, {
    name: "FakeMessageV01",
    definition: "Scope\nA fake message.",
  });
  assert.deepEqual(d.constraints, [
    { name: "FakeRule", definition: "If A then B." },
    { name: "BareRule" },
  ]);
  assert.deepEqual(d.types["Envelope1"], {
    definition: "Any content.",
    elements: {},
  });
  assert.deepEqual(Object.keys(d.types), [
    "Child1",
    "Envelope1",
    "FakeMessageV01",
    "Header1",
  ]);
  assert.deepEqual(d.types["FakeMessageV01"], {
    definition: "Scope\nA fake message.",
    elements: { Hdr: { name: "Header", definition: "The header." } },
  });
  assert.equal(d.types["Header1"]!.definition, "A header.\nSecond line.");
  assert.deepEqual(d.types["Header1"]!.elements["Id"], {
    name: "Ident",
    definition: "An item.",
  });
  assert.deepEqual(Object.keys(d.types["Child1"]!.elements), ["Slf", "Opn"]);
  assert.deepEqual(d.simpleTypes, { Max35Text: { definition: "Short text." } });
  assert.deepEqual(d.codeSets, {
    FakeType1Code: {
      definition: "Derived set.",
      codes: { ALPH: { name: "Alpha", definition: "First one." } },
    },
  });
});

test("throws when the message is missing", async () => {
  await assert.rejects(
    extractDefs(GOOD(), "fake.009.001.01"),
    /0 message definitions/,
  );
});

test("throws on a reachable xsi:type it does not handle, naming id and name", async () => {
  const lines = GOOD().map((l) =>
    l.includes('xmi:id="t1"')
      ? l.replace("iso20022:Text", "iso20022:Weird")
      : l,
  );
  await assert.rejects(
    extractDefs(lines, "fake.001.001.01"),
    /iso20022:Weird.*Max35Text.*t1/,
  );
});

test("throws on a dangling reference", async () => {
  const lines = GOOD().map((l) =>
    l.replace('simpleType="t1"', 'simpleType="gone"'),
  );
  await assert.rejects(extractDefs(lines, "fake.001.001.01"), /"gone".*Ident/);
});

test("throws when a code cannot be resolved to a code value", async () => {
  const lines = GOOD().map((l) => l.replace(' trace="cs0"', ""));
  await assert.rejects(
    extractDefs(lines, "fake.001.001.01"),
    /Alpha.*FakeType1Code/,
  );
});

test("output is deterministic", async () => {
  const a = JSON.stringify(await extractDefs(GOOD(), "fake.001.001.01"));
  const b = JSON.stringify(await extractDefs(GOOD(), "fake.001.001.01"));
  assert.equal(a, b);
});

const REAL =
  "20260904_ISO20022_2013_eRepository/20260904_ISO20022_2013_eRepository.iso20022";
type X = Record<string, unknown>;
const arr = (x: unknown): X[] =>
  x === undefined ? [] : ((Array.isArray(x) ? x : [x]) as X[]);

test(
  "real eRepository covers every complexType and element of the pacs.008.001.14 XSD",
  { skip: !existsSync(REAL) },
  async () => {
    const lines = createInterface({
      input: createReadStream(REAL, "utf8"),
      crlfDelay: Infinity,
    });
    const d = await extractDefs(lines, "pacs.008.001.14");
    const xsd = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    }).parse(readFileSync("schemas/pacs.008.001.14.xsd", "utf8"));
    const missing: string[] = [];
    for (const ct of arr((xsd["xs:schema"] as X)["xs:complexType"])) {
      const name = ct["@_name"] as string;
      const els = [
        ...arr((ct["xs:sequence"] as X | undefined)?.["xs:element"]),
        ...arr((ct["xs:choice"] as X | undefined)?.["xs:element"]),
      ];
      // Document is the wrapper; simpleContent amounts are described by their simple type.
      if (name === "Document" || els.length === 0) continue;
      const t = d.types[name];
      if (!t) missing.push(name);
      else
        for (const e of els)
          if (!t.elements[e["@_name"] as string])
            missing.push(`${name}/${e["@_name"]}`);
    }
    assert.deepEqual(missing, []);
  },
);
