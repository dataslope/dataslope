# Agent Guidelines

Rules and patterns for AI coding agents working in this repository.

---

## Multiple-choice question explanations

Choice explanations in `<MultipleChoice>` blocks are shown to **all** learners after they submit, regardless of which choice they selected. This means the correct choice's explanation is also shown to learners who picked a wrong answer.

**Never start a choice explanation with an affirmative word or phrase.** This includes:

- `Correct!`, `Correct.`, `Correct —`, `Correct:`
- `Right!`, `Right.`
- `Exactly.`, `Exactly!`
- `Yes!`, `Yes.`
- `Perfect!`, `Great!`, `Well done!`

Write the explanation as a neutral statement that stands on its own.

```markdown
<!-- Bad -->
- [o] Tableau
  > Correct! Tableau is widely used for creating interactive dashboards.

<!-- Good -->
- [o] Tableau
  > Tableau is widely used for creating interactive dashboards.
```

---

## Mermaid diagram syntax

Mermaid is strict about special characters. The following rules prevent the most common parse errors.

### 1. Quote node labels that contain special characters

Any label inside `[ ]`, `( )`, `[( )]`, or `{ }` that contains `<br/>`, `:`, `/`, `.`, `(`, `)`, `"`, `,`, `|`, `<`, `>`, `%`, or `#` **must** be wrapped in double quotes.

```
<!-- Bad -->
flowchart LR
    A[hello.c<br/>source text] --> B[Preprocessor]
    C{Solve A x = b?}

<!-- Good -->
flowchart LR
    A["hello.c<br/>source text"] --> B[Preprocessor]
    C{"Solve A x = b?"}
```

### 2. Quote edge labels that contain special characters

Edge labels written as `-->|label|` or `-- label -->` need quotes when the label contains `,`, `:`, `(`, `)`, `/`, or other special characters.

```
<!-- Bad -->
A -->|apply: mean(sales)| B
A -- 1-D, bracketed --> B

<!-- Good -->
A -->|"apply: mean(sales)"| B
A -- "1-D, bracketed" --> B
```

### 3. Dotted edges with labels need spaces around the label

```
<!-- Bad (parse error) -->
A -.label.-> B

<!-- Good -->
A -. label .-> B
```

### 4. sequenceDiagram: no quotes around message text

Message text in `sequenceDiagram` (the part after `->>`/`-->>`/`->`) must **not** be wrapped in quotes.

```
<!-- Bad -->
U->>OS: "Run hello.exe"

<!-- Good -->
U->>OS: Run hello.exe
```

### 5. sequenceDiagram: no semicolons in message text

Semicolons terminate a statement in Mermaid. Use a comma instead.

```
<!-- Bad -->
CPU->>CPU: executes; produces output

<!-- Good -->
CPU->>CPU: executes, produces output
```

### 6. sequenceDiagram participant aliases: no special characters

Participant `as` aliases cannot contain `.`, `(`, `)`, `"`, or other special characters.

```
<!-- Bad -->
participant CLR as .NET runtime
participant Main as "(top level)"

<!-- Good -->
participant CLR as NET runtime
participant Main as top level
```

### 7. subgraph labels: no extra spaces around the label

```
<!-- Bad -->
subgraph Hand[ "By hand" ]

<!-- Good -->
subgraph Hand["By hand"]
```

### Quick checklist before committing a Mermaid block

- [ ] Every node label with special chars is quoted
- [ ] Every edge label with special chars is quoted
- [ ] No semicolons in `sequenceDiagram` message text
- [ ] No quoted strings in `sequenceDiagram` message text
- [ ] Participant aliases contain only plain words
- [ ] Dotted edge labels have spaces: `-. label .->`
- [ ] `subgraph` labels have no extra spaces inside the brackets
