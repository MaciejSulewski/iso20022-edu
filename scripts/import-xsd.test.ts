// Fixtures are synthetic, hand-written XSD snippets with invented names (not ISO text).
import assert from "node:assert/strict";
import { test } from "node:test";
import { importXsd } from "./import-xsd.ts";

const NS = "urn:example:fake:xsd:fake.001.001.01";
const AUTO = `<xs:annotation><xs:documentation><Nm>N</Nm><Dfn>D</Dfn></xs:documentation></xs:annotation>`;
// autodoc adds a documentation block to every complexType/element that lacks one.
const wrap = (rawBody: string, autodoc = true) => {
  const body = autodoc
    ? rawBody
        .replace(
          /<xs:element ([^>]*?)\/>/g,
          `<xs:element $1>${AUTO}</xs:element>`,
        )
        .replace(
          /<xs:complexType name="(\w+)">(?!<xs:annotation>)/g,
          `<xs:complexType name="$1">${AUTO}`,
        )
    : rawBody;
  return `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="${NS}" targetNamespace="${NS}" elementFormDefault="qualified">
<xs:element name="Document" type="Document"/>
<xs:complexType name="Document"><xs:sequence><xs:element name="Msg" type="MsgV01"/></xs:sequence></xs:complexType>
${body}
</xs:schema>`;
};

const doc = (name: string, def: string) =>
  `<xs:annotation><xs:documentation><Nm>${name}</Nm><Dfn>${def}</Dfn></xs:documentation></xs:annotation>`;

const MSG = (inner: string, extra = "") =>
  wrap(
    `<xs:complexType name="MsgV01">${doc("Msg", "A message.")}<xs:sequence>${inner}</xs:sequence></xs:complexType>${extra}`,
  );

const TEXT = `<xs:simpleType name="Text35"><xs:restriction base="xs:string"><xs:minLength value="1"/><xs:maxLength value="35"/></xs:restriction></xs:simpleType>`;

test("resolves id from namespace and root from Document", () => {
  const s = importXsd(MSG(`<xs:element name="A" type="Text35"/>`, TEXT));
  assert.equal(s.id, "fake.001.001.01");
  assert.equal(s.root, "Msg");
  assert.ok(s.complexTypes["MsgV01"]);
});

test("sequence keeps order and min/max, incl. unbounded", () => {
  const s = importXsd(
    MSG(
      `<xs:element name="B" type="Text35"/>
       <xs:element name="A" type="Text35" minOccurs="0"/>
       <xs:element name="C" type="Text35" minOccurs="1" maxOccurs="unbounded"/>
       <xs:element name="D" type="Text35" minOccurs="0" maxOccurs="3"/>`,
      TEXT,
    ),
  );
  const els = s.complexTypes["MsgV01"]!.elements as {
    tag: string;
    min: number;
    max: unknown;
  }[];
  assert.deepEqual(
    els.map((e) => [e.tag, e.min, e.max]),
    [
      ["B", 1, 1],
      ["A", 0, 1],
      ["C", 1, "unbounded"],
      ["D", 0, 3],
    ],
  );
  assert.equal(s.complexTypes["MsgV01"]!.choice, false);
});

test("choice sets choice: true and keeps per-branch multiplicity", () => {
  const xml = wrap(
    `<xs:complexType name="MsgV01"><xs:choice><xs:element name="X" type="Text35"/><xs:element name="Y" type="Text35" maxOccurs="2"/></xs:choice></xs:complexType>${TEXT}`,
  );
  const t = importXsd(xml).complexTypes["MsgV01"]!;
  assert.equal(t.choice, true);
  assert.equal(t.elements.length, 2);
  assert.equal((t.elements[1] as { max: number }).max, 2);
});

test("simpleType facets: length, pattern, digits, minInclusive", () => {
  const s = importXsd(
    MSG(
      `<xs:element name="A" type="Id"/>`,
      `${TEXT}<xs:simpleType name="Id"><xs:restriction base="Text35"><xs:pattern value="[A-Z]{2}"/></xs:restriction></xs:simpleType>
       <xs:simpleType name="Amt"><xs:restriction base="xs:decimal"><xs:totalDigits value="18"/><xs:fractionDigits value="5"/><xs:minInclusive value="0"/></xs:restriction></xs:simpleType>`,
    ),
  );
  assert.deepEqual(s.simpleTypes["Text35"], {
    base: "string",
    minLength: 1,
    maxLength: 35,
  });
  assert.deepEqual(s.simpleTypes["Id"], {
    base: "Text35",
    pattern: "[A-Z]{2}",
  });
  assert.deepEqual(s.simpleTypes["Amt"], {
    base: "decimal",
    totalDigits: 18,
    fractionDigits: 5,
    minInclusive: "0",
  });
});

test("enumeration becomes codes in order", () => {
  const s = importXsd(
    MSG(
      `<xs:element name="A" type="ChargeCode"/>`,
      `<xs:simpleType name="ChargeCode"><xs:restriction base="xs:string"><xs:enumeration value="DEBT"/><xs:enumeration value="CRED"/></xs:restriction></xs:simpleType>`,
    ),
  );
  assert.deepEqual(s.simpleTypes["ChargeCode"], {
    base: "string",
    codes: ["DEBT", "CRED"],
  });
});

test("documentation: Nm/Dfn tags and 'Name = ... Definition = ...' both split", () => {
  const xml = wrap(
    `<xs:complexType name="MsgV01">${doc("Message", "Def one.")}<xs:sequence>
      <xs:element name="A" type="Text35"><xs:annotation><xs:documentation>Name = Alpha Value
Definition = Def two, with
a line break.</xs:documentation></xs:annotation></xs:element>
      </xs:sequence></xs:complexType>${TEXT}`,
  );
  const t = importXsd(xml).complexTypes["MsgV01"]!;
  assert.equal(t.isoName, "Message");
  assert.equal(t.definition, "Def one.");
  assert.deepEqual(t.elements[0], {
    tag: "A",
    isoName: "Alpha Value",
    type: "Text35",
    min: 1,
    max: 1,
    definition: "Def two, with a line break.",
  });
});

test("unrecognised documentation format fails loudly", () => {
  const xml = MSG(
    `<xs:element name="A" type="Text35"><xs:annotation><xs:documentation>just prose</xs:documentation></xs:annotation></xs:element>`,
    TEXT,
  );
  assert.throws(() => importXsd(xml), /documentation.*A/s);
});

test("simpleContent extension keeps base and attributes", () => {
  const s = importXsd(
    MSG(
      `<xs:element name="Amt" type="AmtCcy"/>`,
      `<xs:simpleType name="Dec"><xs:restriction base="xs:decimal"/></xs:simpleType>
       <xs:complexType name="AmtCcy"><xs:simpleContent><xs:extension base="Dec"><xs:attribute name="Ccy" type="CcyCode" use="required"/></xs:extension></xs:simpleContent></xs:complexType>
       <xs:simpleType name="CcyCode"><xs:restriction base="xs:string"><xs:pattern value="[A-Z]{3}"/></xs:restriction></xs:simpleType>`,
    ),
  );
  assert.deepEqual(s.complexTypes["AmtCcy"]!.content, {
    base: "Dec",
    attributes: [{ name: "Ccy", type: "CcyCode", required: true }],
  });
  assert.deepEqual(s.complexTypes["AmtCcy"]!.elements, []);
});

test("xs:any is modelled as { any: true }", () => {
  const s = importXsd(
    MSG(
      `<xs:any minOccurs="0" maxOccurs="unbounded" processContents="lax" namespace="##other"/>`,
    ),
  );
  assert.deepEqual(s.complexTypes["MsgV01"]!.elements, [
    { any: true, min: 0, max: "unbounded" },
  ]);
});

test("output is deterministic", () => {
  const xml = MSG(`<xs:element name="A" type="Text35"/>`, TEXT);
  assert.equal(JSON.stringify(importXsd(xml)), JSON.stringify(importXsd(xml)));
});

test("unmodelled facet fails loudly, naming facet and type", () => {
  const xml = MSG(
    `<xs:element name="A" type="Bad"/>`,
    `<xs:simpleType name="Bad"><xs:restriction base="xs:string"><xs:whiteSpace value="collapse"/></xs:restriction></xs:simpleType>`,
  );
  assert.throws(() => importXsd(xml), /whiteSpace.*Bad/);
});

test("unmodelled child element fails loudly", () => {
  const all = wrap(
    `<xs:complexType name="MsgV01"><xs:all><xs:element name="A" type="Text35"/></xs:all></xs:complexType>${TEXT}`,
  );
  assert.throws(() => importXsd(all), /xs:all.*MsgV01/);
  const grp = wrap(
    `<xs:complexType name="MsgV01"><xs:sequence/><xs:attributeGroup ref="G"/></xs:complexType>`,
  );
  assert.throws(() => importXsd(grp), /xs:attributeGroup.*MsgV01/);
});

test("unmodelled attribute fails loudly", () => {
  const xml = MSG(`<xs:element name="A" type="Text35" nillable="true"/>`, TEXT);
  assert.throws(() => importXsd(xml), /nillable.*MsgV01/);
});

test("missing type reference fails loudly", () => {
  assert.throws(
    () => importXsd(MSG(`<xs:element name="A" type="Nope"/>`)),
    /Nope.*MsgV01/,
  );
});

test("missing Document root fails loudly", () => {
  const xml = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${NS}"></xs:schema>`;
  assert.throws(() => importXsd(xml), /Document/);
});

const noDoc = (inner: string, extra = "") =>
  wrap(
    `<xs:complexType name="MsgV01">${doc("Msg", "A message.")}<xs:sequence>${inner}</xs:sequence></xs:complexType>${extra}`,
    false,
  );

test("missing annotation on a complexType or element fails loudly", () => {
  assert.throws(
    () => importXsd(noDoc(`<xs:element name="B" type="Text35"/>`, TEXT)),
    /missing.*annotation.*B.*MsgV01/,
  );
  const ct = wrap(
    `<xs:complexType name="MsgV01"><xs:sequence/></xs:complexType>`,
    false,
  );
  assert.throws(() => importXsd(ct), /missing.*annotation.*MsgV01/);
});

test("id attributes are accepted", () => {
  const s = importXsd(
    wrap(
      `<xs:complexType name="MsgV01" id="c1">${doc("M", "d")}<xs:sequence id="s1"><xs:element name="A" type="T" id="e1">${AUTO}</xs:element></xs:sequence></xs:complexType>
       <xs:simpleType name="T" id="t1"><xs:restriction base="xs:string" id="r1"><xs:maxLength value="3" id="f1"/></xs:restriction></xs:simpleType>`,
      false,
    ),
  );
  assert.equal(s.simpleTypes["T"]!.maxLength, 3);
});

test("simpleType annotation becomes definition and is validated", () => {
  const ok = importXsd(
    MSG(
      `<xs:element name="A" type="T"/>`,
      `<xs:simpleType name="T">${doc("T", "A text.")}<xs:restriction base="xs:string"/></xs:simpleType>`,
    ),
  );
  assert.equal(ok.simpleTypes["T"]!.definition, "A text.");
  assert.equal(
    importXsd(MSG(`<xs:element name="A" type="Text35"/>`, TEXT)).simpleTypes[
      "Text35"
    ]!.definition,
    undefined,
  );
  assert.throws(
    () =>
      importXsd(
        MSG(
          `<xs:element name="A" type="T"/>`,
          `<xs:simpleType name="T"><xs:annotation><xs:documentation>prose</xs:documentation></xs:annotation><xs:restriction base="xs:string"/></xs:simpleType>`,
        ),
      ),
    /documentation.*T/s,
  );
});

test("duplicate type names fail loudly", () => {
  assert.throws(
    () => importXsd(MSG(`<xs:element name="A" type="Text35"/>`, TEXT + TEXT)),
    /duplicate.*Text35/,
  );
  assert.throws(
    () =>
      importXsd(
        MSG(
          `<xs:element name="A" type="Text35"/>`,
          `${TEXT}<xs:complexType name="Text35"><xs:sequence/></xs:complexType>`,
        ),
      ),
    /duplicate.*Text35/,
  );
});

test("documentation attributes and stray text fail loudly", () => {
  const withDoc = (d: string) =>
    importXsd(
      MSG(
        `<xs:element name="A" type="Text35"><xs:annotation>${d}</xs:annotation></xs:element>`,
        TEXT,
      ),
    );
  assert.throws(
    () =>
      withDoc(
        `<xs:documentation xml:lang="en"><Nm>a</Nm><Dfn>b</Dfn></xs:documentation>`,
      ),
    /xml:lang/,
  );
  assert.throws(
    () =>
      withDoc(
        `<xs:documentation>oops<Nm>a</Nm><Dfn>b</Dfn></xs:documentation>`,
      ),
    /stray text/,
  );
});

test("code values are kept verbatim (no number coercion or trimming)", () => {
  const s = importXsd(
    MSG(
      `<xs:element name="A" type="C"/>`,
      `<xs:simpleType name="C"><xs:restriction base="xs:string"><xs:enumeration value="007"/><xs:enumeration value=" A"/></xs:restriction></xs:simpleType>`,
    ),
  );
  assert.deepEqual(s.simpleTypes["C"]!.codes, ["007", " A"]);
  const n = importXsd(
    wrap(
      `<xs:complexType name="MsgV01">${doc("007", "d")}<xs:sequence/></xs:complexType>`,
      false,
    ),
  );
  assert.equal(n.complexTypes["MsgV01"]!.isoName, "007");
});

test("xs:union and xs:list fail loudly", () => {
  for (const u of ["union", "list"]) {
    const xml = MSG(
      `<xs:element name="A" type="U"/>`,
      `<xs:simpleType name="U"><xs:${u}/></xs:simpleType>`,
    );
    assert.throws(() => importXsd(xml), new RegExp(`xs:${u}.*U`));
  }
});
