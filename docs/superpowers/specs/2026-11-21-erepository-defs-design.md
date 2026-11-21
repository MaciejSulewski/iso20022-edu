# eRepository definitions (T-106, then T-032)

Status: written by the agent without a live approval round; calls marked **[call]** can be reversed in the PR. Amends [[2026-11-21-import-xsd-design]].

## Why
The real pacs.008.001.14 XSD (`schemas/`) has no `xs:documentation`: no full ISO names, no definitions. They live in the ISO 20022 eRepository, which the project owner downloaded locally: `20260904_ISO20022_2013_eRepository/*.iso20022` (113 MB XMI, **git-ignored, never committed**, too big and not needed in the repo) and the ecore metamodel next to it.

## What the eRepository holds (checked 2026-11-21)
One pretty-printed XML file. Top-level `<topLevelDictionaryEntry xsi:type="iso20022:MessageComponent|ChoiceComponent|CodeSet|...">` blocks with `xmi:id`, `name`, `definition`; their children `<messageElement xsi:type="iso20022:MessageAttribute|MessageAssociationEnd" name definition minOccurs maxOccurs xmlTag simpleType|complexType>`; `<messageDefinition name="FIToFICustomerCreditTransferV14">` with `<messageBuildingBlock ... xmlTag complexType>`, `<constraint name definition>` (business rules) and `<messageDefinitionIdentifier businessArea="pacs" messageFunctionality="008" flavour="001" version="14"/>`. References are by `xmi:id`. **Join with the XSD:** XSD `complexType name` = MessageComponent/ChoiceComponent `name`; XSD element `name` = `xmlTag`.

## Goals
1. `scripts/extract-erepository.ts <erepository-file> <business-area.functionality.flavour.version e.g. pacs.008.001.14> [out]` writes a small committed, deterministic `src/data/erepository/<id>.defs.json` containing only what the message reaches (walk from the messageDefinition's building blocks through complexType/simpleType references): message `{name, definition}`, `constraints[{name, definition}]`, `types{ <ComponentName>: { definition, elements{ <xmlTag>: {name, definition} } } }`, and for code sets `codeSets{ <Name>: { definition, codes{ <code>: {name, definition} } } }` (check the metamodel for how codes are stored). **[call]** definitions text kept as in the eRepository (line breaks normalised to `\n`).
2. Streaming/low memory **[call]**: read the file line by line, split into top-level entry blocks, parse each small block with the already-installed `fast-xml-parser` (never load 113 MB into the XML parser). Index entries by `xmi:id`, resolve references lazily.
3. Unknown constructs fail loudly (same rule as the importer): an `xsi:type` or reference the extractor does not handle on a reachable entry throws with the id and name. Unreachable entries are ignored (that is not a silent skip).
4. `import-xsd.ts` gets an optional second input, the defs file. XSD `xs:documentation` becomes **optional** (the real XSD has none). **[call]** With a defs file, every complexType and element of the XSD must find its entry (type by name, element by tag) or the import throws naming it; the result fills `isoName`, `definition` (and `definition` on simpleTypes/codes where present). Without a defs file, behaviour stays as today for documented XSDs (documentation parsed if present, absent fields allowed). The Document wrapper stays exempt.
5. Output adds optional `constraints[{name, definition}]` and, for simpleTypes with code sets, `codes[{code, name, definition}]` **[call]** (the plan's `codes: [..]` array of strings stays valid for plain enumerations).

## Non-goals
No UI; no overlay; no other messages (the extractor takes the message id as an argument, but only pacs.008.001.14 is generated); no parsing of constraint `expression` XML (only name and definition); no committing the eRepository or metamodel.

## Constraints
Third-party text (ISO definitions) is committed under [[ADR-013 Commit the XSDs]]: `THIRD-PARTY-NOTICES.md` covers it; mention eRepository there only if the owner agrees (do not edit the notice text). Tests use small synthetic XMI fixtures (invented names) plus one integration check that runs only if the local eRepository file exists (skipped otherwise, so CI stays green).
