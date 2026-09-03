"use client";

// Document symbols from the Lezer tree the editor already parses, for the
// languages without a client-side language server (Java, PHP) and as the
// pre-boot tier for C/C++. Two sources come out of it: the names declared
// in the document (with their declared types and signatures), and member
// completion after `.` / `->` / `::` / `$this->`, resolved from the
// receiver's declared type against the document's own classes/structs and,
// for Java, a curated JDK member table. No inference beyond one call hop:
// Java 8 has no `var`, so declared types are always spelled out.

import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode, Tree } from "@lezer/common";
import type { EditorState } from "@codemirror/state";
import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from "@codemirror/autocomplete";

import {
  JAVA_ARRAY_MEMBERS,
  JAVA_MEMBERS,
  JAVA_STATIC_RECEIVERS,
  JAVA_SUPERTYPES,
  JAVA_TYPE_PARAMS,
  type JavaMember,
} from "./staticLists/javaMembers";

export type SymbolLanguage = "java" | "c" | "cpp" | "php";

export type SymbolKind =
  | "class"
  | "function"
  | "method"
  | "variable"
  | "property"
  | "constant"
  | "type";

export interface DocumentSymbol {
  /** As it completes: PHP variables keep their `$`, properties don't. */
  name: string;
  kind: SymbolKind;
  /** Declared type text (`String`, `int[]`, `std::vector<int>`, `Cart`). */
  type?: string;
  /** Parameter list, shown as the popup detail. */
  detail?: string;
  from: number;
  to: number;
  /** Enclosing class/struct for members. */
  owner?: string;
  /** Span of the owner's declaration, so unqualified member access inside
   *  the class body can offer them. */
  ownerFrom?: number;
  ownerTo?: number;
  isStatic?: boolean;
}

// ─── Tree walking helpers ──────────────────────────────────────────────────

function text(state: EditorState, node: SyntaxNode | null): string {
  return node ? state.sliceDoc(node.from, node.to) : "";
}

function child(node: SyntaxNode, name: string): SyntaxNode | null {
  return node.getChild(name);
}

function children(node: SyntaxNode, name: string): SyntaxNode[] {
  return node.getChildren(name);
}

/** First direct child whose name matches. */
function firstChild(
  node: SyntaxNode,
  test: (name: string) => boolean,
): SyntaxNode | null {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (test(c.name)) return c;
  }
  return null;
}

/** First descendant (depth-first) whose name matches. */
function firstDescendant(
  node: SyntaxNode,
  test: (name: string) => boolean,
): SyntaxNode | null {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (test(c.name)) return c;
    const inner = firstDescendant(c, test);
    if (inner) return inner;
  }
  return null;
}

function hasModifier(state: EditorState, node: SyntaxNode, word: string): boolean {
  const mods = child(node, "Modifiers");
  if (mods) return new RegExp(`\\b${word}\\b`).test(text(state, mods));
  // C-family and PHP put the keyword as a direct child.
  return !!firstChild(node, (n) => n === word);
}

// ─── Java ──────────────────────────────────────────────────────────────────

const JAVA_TYPE_NODE = (name: string) =>
  /Type$|^TypeName$|^GenericType$|^ArrayType$|^ScopedTypeName$|^void$/.test(name);
const JAVA_CLASS_NODES = new Set([
  "ClassDeclaration",
  "InterfaceDeclaration",
  "EnumDeclaration",
  "RecordDeclaration",
]);

function collectJava(state: EditorState, tree: Tree): DocumentSymbol[] {
  const out: DocumentSymbol[] = [];
  const owners: Array<{ name: string; from: number; to: number }> = [];
  const owner = () => owners[owners.length - 1];
  const withOwner = (sym: DocumentSymbol): DocumentSymbol => {
    const o = owner();
    return o ? { ...sym, owner: o.name, ownerFrom: o.from, ownerTo: o.to } : sym;
  };

  tree.iterate({
    enter: (ref) => {
      const node = ref.node;
      if (JAVA_CLASS_NODES.has(ref.name)) {
        const name = text(state, child(node, "Definition"));
        if (name) {
          out.push(
            withOwner({ name, kind: "class", from: node.from, to: node.to }),
          );
          owners.push({ name, from: node.from, to: node.to });
        }
        return;
      }
      if (ref.name === "MethodDeclaration" || ref.name === "ConstructorDeclaration") {
        const name = text(state, child(node, "Definition"));
        if (!name) return;
        out.push(
          withOwner({
            name,
            kind: "method",
            type: text(state, firstChild(node, JAVA_TYPE_NODE)) || undefined,
            detail: text(state, child(node, "FormalParameters")) || "()",
            from: node.from,
            to: node.to,
            isStatic: hasModifier(state, node, "static"),
          }),
        );
        return;
      }
      if (ref.name === "FieldDeclaration" || ref.name === "LocalVariableDeclaration") {
        const type = text(state, firstChild(node, JAVA_TYPE_NODE)) || undefined;
        const isField = ref.name === "FieldDeclaration";
        for (const decl of children(node, "VariableDeclarator")) {
          const name = text(state, child(decl, "Definition"));
          if (!name) continue;
          const sym: DocumentSymbol = {
            name,
            kind: isField ? "property" : "variable",
            type,
            from: decl.from,
            to: decl.to,
            isStatic: isField ? hasModifier(state, node, "static") : undefined,
          };
          out.push(isField ? withOwner(sym) : sym);
        }
        return;
      }
      if (ref.name === "FormalParameter" || ref.name === "SpreadParameter") {
        const name = text(state, child(node, "Definition"));
        if (name) {
          out.push({
            name,
            kind: "variable",
            type: text(state, firstChild(node, JAVA_TYPE_NODE)) || undefined,
            from: node.from,
            to: node.to,
          });
        }
        return false;
      }
      if (ref.name === "ForSpec") {
        const def = child(node, "Definition");
        if (def) {
          out.push({
            name: text(state, def),
            kind: "variable",
            type: text(state, firstChild(node, JAVA_TYPE_NODE)) || undefined,
            from: def.from,
            to: def.to,
          });
        }
        return;
      }
      if (ref.name === "EnumConstant") {
        const name = text(state, child(node, "Definition"));
        if (name) {
          out.push(
            withOwner({
              name,
              kind: "constant",
              type: owner()?.name,
              from: node.from,
              to: node.to,
              isStatic: true,
            }),
          );
        }
        return false;
      }
      return;
    },
    leave: (ref) => {
      if (JAVA_CLASS_NODES.has(ref.name)) {
        const top = owner();
        if (top && top.from === ref.from) owners.pop();
      }
    },
  });
  return out;
}

// ─── C / C++ (one grammar) ─────────────────────────────────────────────────

const C_TYPE_NODE = (name: string) =>
  /^(PrimitiveType|TypeIdentifier|TemplateType|ScopedTypeIdentifier|StructSpecifier|ClassSpecifier|EnumSpecifier|UnionSpecifier|SizedTypeSpecifier)$/.test(
    name,
  );
const C_NAME_NODE = (name: string) =>
  name === "Identifier" || name === "FieldIdentifier";
const C_DECLARATOR_NODE = (name: string) =>
  /Declarator$|^Identifier$|^FieldIdentifier$/.test(name);
const C_RECORD_NODES = new Set([
  "StructSpecifier",
  "ClassSpecifier",
  "UnionSpecifier",
]);

/** `struct point`, `const char *`, `std::vector<int>` → the bare type
 *  name a struct/class table is keyed by. */
export function baseTypeName(type: string): string {
  return type
    .replace(/\b(struct|class|union|enum|const|volatile|static|final|unsigned|signed)\b/g, "")
    .replace(/<.*$/, "")
    .replace(/[*&[\]\s]/g, "")
    .replace(/^.*::/, "")
    // `java.util.List` → `List`; a stray `x.` glued on by error recovery
    // goes the same way.
    .replace(/^.*\./, "");
}

function collectC(state: EditorState, tree: Tree): DocumentSymbol[] {
  const out: DocumentSymbol[] = [];
  const owners: Array<{ name: string; from: number; to: number }> = [];
  const owner = () => owners[owners.length - 1];
  const withOwner = (sym: DocumentSymbol): DocumentSymbol => {
    const o = owner();
    return o ? { ...sym, owner: o.name, ownerFrom: o.from, ownerTo: o.to } : sym;
  };
  // `typedef struct { … } Rec;` names the anonymous struct after the fact.
  const pendingTypedef: Array<{ record: SyntaxNode; name: string }> = [];

  const declaratorName = (decl: SyntaxNode): SyntaxNode | null =>
    C_NAME_NODE(decl.name) ? decl : firstDescendant(decl, C_NAME_NODE);

  tree.iterate({
    enter: (ref) => {
      const node = ref.node;
      if (C_RECORD_NODES.has(ref.name)) {
        let name = text(state, child(node, "TypeIdentifier"));
        if (!name && node.parent?.name === "TypeDefinition") {
          const alias = node.parent.getChildren("TypeIdentifier").pop();
          name = text(state, alias ?? null);
        }
        if (name) {
          out.push({ name, kind: "type", from: node.from, to: node.to });
          owners.push({ name, from: node.from, to: node.to });
        }
        return;
      }
      if (ref.name === "TypeDefinition") {
        const alias = node.getChildren("TypeIdentifier").pop();
        const record = firstChild(node, (n) => C_RECORD_NODES.has(n));
        if (alias) {
          const name = text(state, alias);
          if (record && child(record, "TypeIdentifier")) {
            // Named struct with an alias: both names reach the fields.
            pendingTypedef.push({ record, name });
          } else if (!record) {
            out.push({
              name,
              kind: "type",
              type: text(state, firstChild(node, C_TYPE_NODE)) || undefined,
              from: node.from,
              to: node.to,
            });
          }
        }
        return;
      }
      if (ref.name === "EnumSpecifier") {
        const name = text(state, child(node, "TypeIdentifier"));
        if (name) out.push({ name, kind: "type", from: node.from, to: node.to });
        const list = child(node, "EnumeratorList");
        if (list) {
          for (const en of children(list, "Enumerator")) {
            const id = child(en, "Identifier");
            if (id) {
              out.push({
                name: text(state, id),
                kind: "constant",
                type: name || undefined,
                owner: name || undefined,
                ownerFrom: node.from,
                ownerTo: node.to,
                isStatic: true,
                from: id.from,
                to: id.to,
              });
            }
          }
        }
        return false;
      }
      if (ref.name === "FunctionDefinition" || ref.name === "Declaration") {
        const type = text(state, firstChild(node, C_TYPE_NODE)) || undefined;
        const fn = child(node, "FunctionDeclarator") ??
          firstDescendant(node, (n) => n === "FunctionDeclarator");
        if (fn && (ref.name === "FunctionDefinition" || fn.parent === node || fn.parent?.name.endsWith("Declarator"))) {
          const id = firstChild(fn, (n) => C_NAME_NODE(n) || n === "ScopedIdentifier" || n === "DestructorName");
          const name = text(state, id).replace(/^.*::/, "");
          if (name) {
            out.push(
              withOwner({
                name,
                kind: owner() ? "method" : "function",
                type,
                detail: text(state, child(fn, "ParameterList")) || "()",
                from: node.from,
                to: node.to,
                isStatic: hasModifier(state, node, "static") || undefined,
              }),
            );
          }
          // Parameters are declared inside; keep walking.
          return;
        }
        for (const decl of node.getChildren("Identifier")
          .concat(
            children(node, "InitDeclarator"),
            children(node, "PointerDeclarator"),
            children(node, "ArrayDeclarator"),
            children(node, "ReferenceDeclarator"),
          )) {
          const id = declaratorName(decl);
          if (!id) continue;
          out.push(
            withOwner({
              name: text(state, id),
              kind: owner() ? "property" : "variable",
              type,
              from: id.from,
              to: id.to,
              isStatic: hasModifier(state, node, "static") || undefined,
            }),
          );
        }
        return;
      }
      if (ref.name === "FieldDeclaration") {
        const type = text(state, firstChild(node, C_TYPE_NODE)) || undefined;
        const fn = firstChild(node, (n) => n === "FunctionDeclarator");
        if (fn) {
          const id = firstChild(fn, C_NAME_NODE);
          if (id) {
            out.push(
              withOwner({
                name: text(state, id),
                kind: "method",
                type,
                detail: text(state, child(fn, "ParameterList")) || "()",
                from: node.from,
                to: node.to,
                isStatic: hasModifier(state, node, "static") || undefined,
              }),
            );
          }
          return;
        }
        for (let c = node.firstChild; c; c = c.nextSibling) {
          if (!C_DECLARATOR_NODE(c.name) || C_TYPE_NODE(c.name)) continue;
          const id = declaratorName(c);
          if (!id) continue;
          out.push(
            withOwner({
              name: text(state, id),
              kind: "property",
              type,
              from: id.from,
              to: id.to,
              isStatic: hasModifier(state, node, "static") || undefined,
            }),
          );
        }
        return false;
      }
      if (ref.name === "ParameterDeclaration" || ref.name === "OptionalParameterDeclaration") {
        const decl = firstChild(node, (n) => C_DECLARATOR_NODE(n) && !C_TYPE_NODE(n));
        const id = decl ? declaratorName(decl) : null;
        if (id) {
          out.push({
            name: text(state, id),
            kind: "variable",
            type: text(state, firstChild(node, C_TYPE_NODE)) || undefined,
            from: id.from,
            to: id.to,
          });
        }
        return false;
      }
      return;
    },
    leave: (ref) => {
      if (C_RECORD_NODES.has(ref.name)) {
        const top = owner();
        if (top && top.from === ref.from) owners.pop();
      }
    },
  });

  for (const { record, name } of pendingTypedef) {
    const structName = text(state, child(record, "TypeIdentifier"));
    out.push({
      name,
      kind: "type",
      type: structName,
      from: record.from,
      to: record.to,
    });
  }
  return out;
}

// ─── PHP ───────────────────────────────────────────────────────────────────

const PHP_CLASS_NODES = new Set([
  "ClassDeclaration",
  "InterfaceDeclaration",
  "TraitDeclaration",
  "EnumDeclaration",
]);

function collectPhp(state: EditorState, tree: Tree): DocumentSymbol[] {
  const out: DocumentSymbol[] = [];
  const owners: Array<{ name: string; from: number; to: number }> = [];
  const owner = () => owners[owners.length - 1];
  const withOwner = (sym: DocumentSymbol): DocumentSymbol => {
    const o = owner();
    return o ? { ...sym, owner: o.name, ownerFrom: o.from, ownerTo: o.to } : sym;
  };

  tree.iterate({
    enter: (ref) => {
      const node = ref.node;
      if (PHP_CLASS_NODES.has(ref.name)) {
        const name = text(state, child(node, "Name"));
        if (name) {
          out.push({ name, kind: "class", from: node.from, to: node.to });
          owners.push({ name, from: node.from, to: node.to });
        }
        return;
      }
      if (ref.name === "FunctionDefinition" || ref.name === "MethodDeclaration") {
        const name = text(state, child(node, "Name"));
        if (!name) return;
        const ret = child(node, "NamedType") ?? child(node, "OptionalType") ?? child(node, "UnionType");
        out.push(
          withOwner({
            name,
            kind: ref.name === "MethodDeclaration" ? "method" : "function",
            type: text(state, ret) || undefined,
            detail: text(state, child(node, "ParamList")) || "()",
            from: node.from,
            to: node.to,
            isStatic: !!firstChild(node, (n) => n === "static") || undefined,
          }),
        );
        return;
      }
      if (ref.name === "PropertyDeclaration") {
        const type = text(state, firstChild(node, (n) => /Type$/.test(n))) || undefined;
        const isStatic = !!firstChild(node, (n) => n === "static") || undefined;
        for (const decl of children(node, "VariableDeclarator")) {
          const name = text(state, child(decl, "VariableName")).replace(/^\$/, "");
          if (name) {
            out.push(
              withOwner({
                name,
                kind: "property",
                type,
                from: decl.from,
                to: decl.to,
                isStatic,
              }),
            );
          }
        }
        return false;
      }
      if (ref.name === "ConstDeclaration") {
        for (const decl of children(node, "VariableDeclarator")) {
          const name = text(state, child(decl, "Name"));
          if (name) {
            out.push(
              withOwner({
                name,
                kind: "constant",
                from: decl.from,
                to: decl.to,
                isStatic: true,
              }),
            );
          }
        }
        return false;
      }
      if (ref.name === "Parameter") {
        const vn = child(node, "VariableName");
        if (vn) {
          out.push({
            name: text(state, vn),
            kind: "variable",
            type: text(state, firstChild(node, (n) => /Type$/.test(n))) || undefined,
            from: vn.from,
            to: vn.to,
          });
        }
        return false;
      }
      if (ref.name === "AssignmentExpression") {
        const target = node.firstChild;
        if (target?.name === "VariableName") {
          // `$x = new Foo(...)` is the one inference worth having: it is
          // what makes `$x->` list Foo's members.
          const value = node.lastChild;
          let type: string | undefined;
          if (value?.name === "NewExpression") {
            type = text(state, child(value, "Name")) || undefined;
          }
          out.push({
            name: text(state, target),
            kind: "variable",
            type,
            from: target.from,
            to: target.to,
          });
        }
        return;
      }
      if (ref.name === "ForSpec" || ref.name === "Pair") {
        // `foreach ($rows as $k => $row)`: only the names after `as` are
        // declared here; `$rows` keeps whatever declared it.
        let declaring = ref.name === "Pair";
        for (let c = node.firstChild; c; c = c.nextSibling) {
          if (c.name === "as") declaring = true;
          if (!declaring || c.name !== "VariableName") continue;
          out.push({
            name: text(state, c),
            kind: "variable",
            from: c.from,
            to: c.to,
          });
        }
        return;
      }
      return;
    },
    leave: (ref) => {
      if (PHP_CLASS_NODES.has(ref.name)) {
        const top = owner();
        if (top && top.from === ref.from) owners.pop();
      }
    },
  });
  return out;
}

// ─── Cache + public collectors ─────────────────────────────────────────────

const COLLECTORS: Record<SymbolLanguage, (s: EditorState, t: Tree) => DocumentSymbol[]> = {
  java: collectJava,
  c: collectC,
  cpp: collectC,
  php: collectPhp,
};

const cache = new WeakMap<Tree, DocumentSymbol[]>();

export function documentSymbols(
  state: EditorState,
  language: SymbolLanguage,
): DocumentSymbol[] {
  const tree = syntaxTree(state);
  // A tree of length 0 is the placeholder before the grammar loads.
  if (tree.length === 0 && state.doc.length > 0) return [];
  const hit = cache.get(tree);
  if (hit) return hit;
  let symbols: DocumentSymbol[];
  try {
    symbols = COLLECTORS[language](state, tree);
  } catch {
    symbols = [];
  }
  cache.set(tree, symbols);
  return symbols;
}

// ─── Sources ───────────────────────────────────────────────────────────────

const KIND_TO_CM: Record<SymbolKind, string> = {
  class: "class",
  function: "function",
  method: "method",
  variable: "variable",
  property: "property",
  constant: "constant",
  type: "type",
};

function toCompletion(sym: DocumentSymbol): Completion {
  return {
    label: sym.name,
    type: KIND_TO_CM[sym.kind],
    detail: sym.detail ?? sym.type,
    boost: sym.kind === "variable" ? 1 : 0,
  };
}

const WORD_RE: Record<SymbolLanguage, RegExp> = {
  java: /[\w$]*$/,
  c: /\w*$/,
  cpp: /\w*$/,
  php: /\$?[\w]*$/,
};

/**
 * Names declared in the document: every top-level declaration and local,
 * plus the members of whichever class/struct body the cursor is inside
 * (unqualified access to your own methods and fields).
 */
export function documentSymbolSource(language: SymbolLanguage): CompletionSource {
  return (ctx) => {
    const word = ctx.matchBefore(WORD_RE[language]);
    if (!word && !ctx.explicit) return null;
    const from = word ? word.from : ctx.pos;
    const symbols = documentSymbols(ctx.state, language);
    if (symbols.length === 0) return null;
    const seen = new Set<string>();
    const options: Completion[] = [];
    for (const sym of symbols) {
      // Never offer the name being declared right now back to itself.
      if (sym.from <= ctx.pos && sym.to >= from) continue;
      if (sym.owner !== undefined) {
        const inside =
          sym.ownerFrom !== undefined &&
          sym.ownerTo !== undefined &&
          ctx.pos >= sym.ownerFrom &&
          ctx.pos <= sym.ownerTo;
        if (!inside) continue;
        if (language === "php" && !sym.isStatic && sym.kind !== "method") continue;
      }
      if (seen.has(sym.name)) continue;
      seen.add(sym.name);
      options.push(toCompletion(sym));
    }
    if (options.length === 0) return null;
    return { from, options, validFor: /^[\w$]*$/ };
  };
}

// ─── Member resolution ─────────────────────────────────────────────────────

interface MemberQuery {
  /** Receiver chain, outermost first: `["System", "out"]`, `["s", "trim()"]`. */
  chain: string[];
  /** The operator right before the token (`.`, `->`, `::`). */
  operator: string;
  from: number;
}

// A chain segment: a name, optionally called with arguments that contain
// no parentheses of their own (`get(0)`, `trim()`; not `f(g(x))`).
const MEMBER_RE: Record<SymbolLanguage, RegExp> = {
  java: /([A-Za-z_$][\w$]*(?:\([^()]*\))?(?:\.[A-Za-z_$][\w$]*(?:\([^()]*\))?)*)\.([\w$]*)$/,
  c: /([A-Za-z_]\w*(?:\([^()]*\))?(?:(?:\.|->)[A-Za-z_]\w*(?:\([^()]*\))?)*)(\.|->)(\w*)$/,
  cpp: /([A-Za-z_]\w*(?:\([^()]*\))?(?:(?:\.|->|::)[A-Za-z_]\w*(?:\([^()]*\))?)*)(\.|->|::)(\w*)$/,
  php: /((?:\$[A-Za-z_]\w*|[A-Za-z_]\w*)(?:\([^()]*\))?(?:(?:->|::)\$?[A-Za-z_]\w*(?:\([^()]*\))?)*)(->|::)(\$?\w*)$/,
};

/** Split a receiver chain on its operators, ignoring dots inside call
 *  arguments (`xs.get(a.b).`). */
function splitChain(receiver: string, operators: RegExp): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < receiver.length; i++) {
    const ch = receiver[i];
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0) {
      const rest = receiver.slice(i);
      const op = operators.exec(rest);
      if (op && op.index === 0) {
        out.push(current);
        current = "";
        i += op[0].length - 1;
        continue;
      }
    }
    current += ch;
  }
  out.push(current);
  return out;
}

const CALL_SUFFIX = /\([^()]*\)$/;

function parseMemberQuery(
  ctx: CompletionContext,
  language: SymbolLanguage,
): MemberQuery | null {
  const line = ctx.state.doc.lineAt(ctx.pos);
  const before = ctx.state.sliceDoc(line.from, ctx.pos);
  const m = MEMBER_RE[language].exec(before);
  if (!m) return null;
  if (language === "java") {
    return {
      chain: splitChain(m[1], /^\./),
      operator: ".",
      from: ctx.pos - m[2].length,
    };
  }
  const receiver = m[1];
  const operator = m[2];
  const token = m[3];
  return {
    chain: splitChain(receiver, /^(?:->|::|\.)/),
    operator,
    from: ctx.pos - token.length,
  };
}

/** Nearest declaration of `name` before `pos` (or any, as a fallback). */
function declaredType(
  symbols: DocumentSymbol[],
  name: string,
  pos: number,
): DocumentSymbol | undefined {
  let best: DocumentSymbol | undefined;
  for (const sym of symbols) {
    if (sym.name !== name || sym.owner !== undefined) continue;
    if (sym.from <= pos) {
      if (!best || sym.from > best.from) best = sym;
    } else if (!best) {
      best = sym;
    }
  }
  return best;
}

/** Resolved receiver: a type name plus whether we hold an instance. */
interface Resolved {
  type: string;
  generics: string[];
  instance: boolean;
}

function splitGenerics(type: string): { base: string; args: string[] } {
  const lt = type.indexOf("<");
  if (lt < 0) return { base: baseTypeName(type), args: [] };
  const base = baseTypeName(type.slice(0, lt));
  const inner = type.slice(lt + 1, type.lastIndexOf(">"));
  const args: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "<") depth++;
    if (ch === ">") depth--;
    if (ch === "," && depth === 0) {
      args.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) args.push(cur.trim());
  return { base, args };
}

function javaMembersOf(type: string): JavaMember[] {
  const out: JavaMember[] = [];
  const seen = new Set<string>();
  for (const t of [type, ...(JAVA_SUPERTYPES[type] ?? [])]) {
    for (const member of JAVA_MEMBERS[t] ?? []) {
      const key = `${member.name}${member.sig}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(member);
    }
  }
  return out;
}

/** Substitute the declaring type's placeholders with the receiver's
 *  generic arguments (`E` → `Integer` for `List<Integer>`). */
function substitute(ret: string, base: string, generics: string[]): string {
  const params = JAVA_TYPE_PARAMS[base];
  if (!params || generics.length === 0) return ret;
  return ret.replace(/\b[A-Z]\b/g, (letter) => {
    const idx = params.indexOf(letter);
    return idx >= 0 && generics[idx] ? generics[idx] : letter;
  });
}

function resolveJava(
  symbols: DocumentSymbol[],
  chain: string[],
  pos: number,
): Resolved | null {
  let current: Resolved | null = null;
  for (let i = 0; i < chain.length; i++) {
    const segment = chain[i];
    const isCall = CALL_SUFFIX.test(segment);
    const name = segment.replace(CALL_SUFFIX, "");
    if (i === 0) {
      const sym = declaredType(symbols, name, pos);
      if (sym && sym.type && !isCall) {
        current = { ...splitGenericsToResolved(sym.type), instance: true };
      } else if (sym && isCall && sym.type) {
        current = { ...splitGenericsToResolved(sym.type), instance: true };
      } else if (JAVA_MEMBERS[name] || symbols.some((s) => s.name === name && s.kind === "class")) {
        current = { type: name, generics: [], instance: false };
      } else {
        return null;
      }
      continue;
    }
    if (!current) return null;
    const holder: Resolved = current;
    const key = `${holder.type}.${name}`;
    if (!holder.instance && JAVA_STATIC_RECEIVERS[key]) {
      current = { type: JAVA_STATIC_RECEIVERS[key], generics: [], instance: true };
      continue;
    }
    if (holder.type.endsWith("[]")) {
      if (name === "length") return null;
      if (name === "clone") {
        current = { type: holder.type, generics: holder.generics, instance: true };
        continue;
      }
      return null;
    }
    const tableMember = javaMembersOf(holder.type).find(
      (mm) => mm.name === name && (holder.instance ? !mm.static : !!mm.static),
    );
    const docMember = tableMember
      ? undefined
      : symbols.find((s) => s.owner === holder.type && s.name === name);
    const ret: string | undefined = tableMember ? tableMember.ret : docMember?.type;
    if (!ret) return null;
    const substituted = substitute(ret, holder.type, holder.generics);
    current = { ...splitGenericsToResolved(substituted), instance: true };
  }
  return current;
}

function splitGenericsToResolved(type: string): { type: string; generics: string[] } {
  const isArray = /\[\]\s*$/.test(type);
  const { base, args } = splitGenerics(type.replace(/\[\]\s*$/, ""));
  return { type: isArray ? `${base}[]` : base, generics: args };
}

function javaMemberCompletions(
  symbols: DocumentSymbol[],
  resolved: Resolved,
): Completion[] {
  const options: Completion[] = [];
  const seen = new Set<string>();
  if (resolved.type.endsWith("[]")) {
    for (const mm of JAVA_ARRAY_MEMBERS) {
      options.push({ label: mm.name, type: mm.field ? "property" : "method", detail: mm.sig || mm.ret });
    }
    return options;
  }
  const known =
    resolved.type in JAVA_MEMBERS || resolved.type in JAVA_SUPERTYPES;
  // A class declared in the document still inherits Object.
  const table = known
    ? javaMembersOf(resolved.type)
    : resolved.instance
      ? javaMembersOf("Object")
      : [];
  for (const mm of table) {
    if (resolved.instance ? mm.static : !mm.static) continue;
    if (seen.has(mm.name)) continue;
    seen.add(mm.name);
    const ret = substitute(mm.ret, resolved.type, resolved.generics);
    const sig = substitute(mm.sig, resolved.type, resolved.generics);
    options.push({
      label: mm.name,
      type: mm.field ? (mm.static ? "constant" : "property") : "method",
      detail: mm.field ? ret : `${sig}: ${ret}`,
    });
  }
  for (const sym of symbols) {
    if (sym.owner !== resolved.type) continue;
    if (resolved.instance ? sym.isStatic : !sym.isStatic) continue;
    if (seen.has(sym.name)) continue;
    seen.add(sym.name);
    options.push(toCompletion(sym));
  }
  return options;
}

function recordMemberCompletions(
  symbols: DocumentSymbol[],
  typeName: string,
  wantStatic: boolean | null,
  language: SymbolLanguage,
): Completion[] {
  // Follow `typedef struct named alias;` one hop.
  const alias = symbols.find((s) => s.kind === "type" && s.name === typeName && s.type);
  const owner = alias?.type ? baseTypeName(alias.type) : typeName;
  const options: Completion[] = [];
  const seen = new Set<string>();
  for (const sym of symbols) {
    if (sym.owner !== owner) continue;
    if (wantStatic !== null && !!sym.isStatic !== wantStatic) continue;
    if (seen.has(sym.name)) continue;
    seen.add(sym.name);
    const c = toCompletion(sym);
    if (language === "php" && sym.kind === "property" && wantStatic) c.label = `$${sym.name}`;
    options.push(c);
  }
  return options;
}

function resolveRecordChain(
  symbols: DocumentSymbol[],
  chain: string[],
  pos: number,
): { type: string; instance: boolean } | null {
  let type: string | null = null;
  let instance = true;
  for (let i = 0; i < chain.length; i++) {
    const segment = chain[i];
    const isCall = CALL_SUFFIX.test(segment);
    const name = segment.replace(CALL_SUFFIX, "");
    if (i === 0) {
      if (name === "$this" || name === "self" || name === "static") {
        const enclosing = symbols.find(
          (s) => s.kind === "class" && s.from <= pos && s.to >= pos,
        );
        if (!enclosing) return null;
        type = enclosing.name;
        instance = name === "$this";
        continue;
      }
      const sym = declaredType(symbols, name, pos);
      if (sym?.type) {
        type = baseTypeName(sym.type);
        instance = true;
      } else if (symbols.some((s) => (s.kind === "type" || s.kind === "class") && s.name === name)) {
        type = name;
        instance = false;
      } else {
        return null;
      }
      continue;
    }
    if (!type) return null;
    const member = symbols.find((s) => s.owner === type && s.name === name.replace(/^\$/, ""));
    if (!member?.type) return null;
    type = baseTypeName(member.type);
    instance = true;
  }
  return type ? { type, instance } : null;
}

/**
 * Member completion after `.` / `->` / `::` from declared types. Answers
 * null when the receiver cannot be resolved, so callers can fall back to
 * something coarser (document words).
 */
export function documentMemberSource(language: SymbolLanguage): CompletionSource {
  return (ctx): CompletionResult | null => {
    const query = parseMemberQuery(ctx, language);
    if (!query) return null;
    const symbols = documentSymbols(ctx.state, language);
    let options: Completion[] = [];
    if (language === "java") {
      const resolved = resolveJava(symbols, query.chain, ctx.pos);
      if (!resolved) return null;
      options = javaMemberCompletions(symbols, resolved);
    } else {
      const resolved = resolveRecordChain(symbols, query.chain, ctx.pos);
      if (!resolved) return null;
      const wantStatic =
        query.operator === "::" ? true : language === "php" ? false : null;
      options = recordMemberCompletions(symbols, resolved.type, wantStatic, language);
    }
    if (options.length === 0) return null;
    return { from: query.from, options, validFor: /^\$?[\w$]*$/ };
  };
}

/** Test-only handles. */
export const _internal = { parseMemberQuery, resolveJava, splitGenerics };
