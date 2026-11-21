// Fixtures are synthetic, hand-written XSD snippets with invented names (not ISO text).
import assert from "node:assert/strict";
import { test } from "node:test";
import { importXsd } from "./import-xsd.ts";

const NS = "urn:example:fake:xsd:fake.001.001.01";
const wrap = (body: string) =>
  `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="${NS}" targetNamespace="${NS}" elementFormDefault="qualified">
<xs:element name="Document" type="Document"/>
<xs:complexType name="Document"><xs:sequence><xs:element name="Msg" type="MsgV01"/></xs:sequence></xs:complexType>
${body}
</xs:schema>`;

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
      <xs:element name="B" type="Text35"/></xs:sequence></xs:complexType>${TEXT}`,
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
  // no annotation: falls back to the tag, empty definition
  assert.equal((t.elements[1] as { isoName: string }).isoName, "B");
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
