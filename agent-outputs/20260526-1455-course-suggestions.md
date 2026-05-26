# Course Suggestions for Dataslope

**Generated:** 2026-05-26  
**Purpose:** Comprehensive course suggestions covering all available runtimes and topic domains

---

## Platform Runtimes Available

| Runtime | Version | Language(s) |
|---------|---------|-------------|
| Pyodide | 0.29.4 | Python 3.13.2 |
| almostnode | latest | JavaScript, TypeScript |
| CheerpJ | latest | Java |
| browsercc | latest | C, C++ |
| .NET WASM | latest | C# |
| webR | 0.6.0 | R 4.6.0 |
| php-wasm | 0.1.0 | PHP 8.4 |
| @sqlite.org/sqlite-wasm | latest | SQLite |
| PGlite | 0.4.5 | PostgreSQL 17 |
| @duckdb/duckdb-wasm | latest | DuckDB |

---

## Existing Courses (4)

1. **Python Basics** — Python fundamentals, data types, control flow, OOP, file I/O
2. **Mastering Data Structures and Algorithms with C++** — Arrays through graphs, DP, greedy, backtracking
3. **Object-Oriented Programming Blueprint with Java** — OOP principles, design patterns, architecture
4. **Systems Programming with C** — Pointers, memory layout, heap allocation, strings, memory bugs

---

## Suggested New Courses (40+)

---

### Python Track

#### 1. Python for Data Science
*Runtime: Python*

- NumPy arrays, broadcasting, vectorized operations
- Pandas DataFrames: loading, slicing, groupby, merge/join
- Data cleaning: handling missing values, duplicates, type coercion
- Exploratory data analysis (EDA) workflow
- Working with CSV, JSON, and Parquet files
- Statistical summaries and descriptive statistics
- Time series data with `datetime` and Pandas period indexing
- Introduction to `scikit-learn`: train/test split, model fitting, evaluation

#### 2. Python for Data Visualization
*Runtime: Python*

- Matplotlib fundamentals: figures, axes, subplots
- Seaborn for statistical charts: heatmaps, violin plots, pair plots
- Plotly and interactive charts
- Visualizing distributions, correlations, and time series
- Geographic data visualization basics
- Dashboard prototyping with Plotly Express
- Choosing the right chart type for the data story
- Exporting and embedding visualizations

#### 3. Python Concurrency and Async Programming
*Runtime: Python*

- Threads vs. processes vs. coroutines
- The GIL and when it matters
- `threading` and `multiprocessing` modules
- `asyncio` event loop, coroutines, `async`/`await`
- `aiohttp` for async HTTP requests
- Task groups and structured concurrency (Python 3.11+)
- Common pitfalls: deadlocks, race conditions, shared state
- Benchmarking concurrent code

#### 4. Python Type System and Modern Python
*Runtime: Python*

- Type hints: basic annotations, `Optional`, `Union`, `Literal`
- `dataclasses` and `NamedTuple`
- Generics and `TypeVar`
- Protocol and structural subtyping
- `mypy` and static type checking workflow
- `match` statement (structural pattern matching, Python 3.10+)
- `walrus` operator and assignment expressions
- `__slots__`, `__init_subclass__`, metaclasses

#### 5. Python Design Patterns
*Runtime: Python*

- Creational patterns: Singleton, Factory, Builder, Prototype
- Structural patterns: Adapter, Decorator, Facade, Proxy
- Behavioral patterns: Observer, Strategy, Command, Iterator
- Pythonic alternatives to classical GoF patterns
- Context managers as resource management patterns
- Functional patterns: currying, memoization, monads in Python
- Anti-patterns to avoid in Python codebases

#### 6. Scientific Computing with Python
*Runtime: Python*

- SciPy ecosystem overview
- Numerical integration and differentiation
- Linear algebra with NumPy: eigenvalues, SVD, matrix decomposition
- Solving systems of linear equations
- Optimization: `scipy.optimize` — minimization, root finding
- Signal processing basics: FFT, filtering
- Random number generation and Monte Carlo simulation
- Introduction to symbolic computation with SymPy

---

### JavaScript & TypeScript Track

#### 7. JavaScript Fundamentals
*Runtime: JavaScript*

- Variables: `var`, `let`, `const` and scoping rules
- Functions: declarations, expressions, arrow functions, closures
- Prototypes and the prototype chain
- `this` binding and common pitfalls
- The event loop, call stack, and microtask queue
- Promises, async/await, and error handling
- ES modules: `import`, `export`, named vs. default
- Iterators, generators, and `Symbol.iterator`

#### 8. TypeScript from Scratch
*Runtime: TypeScript*

- TypeScript setup, `tsconfig.json` options
- Basic types vs. JavaScript: `string`, `number`, `boolean`, `unknown`, `never`
- Interfaces vs. type aliases
- Generics: functions, classes, constraints
- Utility types: `Partial`, `Required`, `Pick`, `Omit`, `Record`, `ReturnType`
- Discriminated unions and exhaustive checking
- Decorators and metadata reflection
- TypeScript compiler internals and performance tips

#### 9. Functional Programming with JavaScript
*Runtime: JavaScript*

- Pure functions and referential transparency
- Immutability and persistent data structures
- Higher-order functions: `map`, `filter`, `reduce`
- Function composition and piping
- Currying and partial application
- Monads and functors in plain JS (Maybe, Either)
- Transducers for efficient data pipelines
- Comparing FP libraries: Ramda, fp-ts

#### 10. Data Structures and Algorithms with JavaScript
*Runtime: JavaScript*

- Arrays, strings, and two-pointer techniques
- Hash maps and sets for O(1) lookup
- Linked lists: singly, doubly, and circular
- Stacks and queues with real-world use cases
- Trees: BST, AVL, traversal algorithms
- Heaps and priority queues
- Graphs: BFS, DFS, Dijkstra, topological sort
- Dynamic programming patterns in JS

---

### C++ Track

#### 11. Modern C++ (C++17/20/23)
*Runtime: C++*

- `auto`, range-based for, structured bindings
- Move semantics, rvalue references, `std::move`
- Smart pointers: `unique_ptr`, `shared_ptr`, `weak_ptr`
- Lambdas: capture lists, generic lambdas, immediately-invoked
- `std::optional`, `std::variant`, `std::any`
- Concepts and constraints (C++20)
- Coroutines introduction (C++20)
- Ranges library and views (C++20)

#### 12. C++ Template Metaprogramming
*Runtime: C++*

- Function templates and class templates
- Template specialization and partial specialization
- Variadic templates and parameter packs
- SFINAE and `std::enable_if`
- `if constexpr` for compile-time branching
- `constexpr` functions and `consteval`
- Type traits and the `<type_traits>` library
- Expression templates and CRTP (Curiously Recurring Template Pattern)

#### 13. C++ Systems and Performance Programming
*Runtime: C++*

- Memory model: stack, heap, static, thread-local
- Cache locality and data-oriented design
- SIMD intrinsics overview
- Lock-free data structures with `std::atomic`
- `std::thread`, mutexes, condition variables
- Custom allocators and memory pools
- Profiling and benchmarking with `std::chrono`
- Undefined behavior and sanitizers

#### 14. Game Development Fundamentals with C++
*Runtime: C++*

- Game loop architecture
- Entity-Component-System (ECS) pattern
- 2D vector math: dot product, cross product, normalization
- Collision detection: AABB, circle, SAT
- Finite state machines for game AI
- Data-oriented design in games
- Asset management and resource loading
- Introduction to SDL2 concepts

---

### Java Track

#### 15. Java Collections and Generics Deep Dive
*Runtime: Java*

- The Collections hierarchy: `List`, `Set`, `Map`, `Queue`, `Deque`
- `ArrayList` vs. `LinkedList` vs. `ArrayDeque`
- `HashMap`, `TreeMap`, `LinkedHashMap` internals
- `HashSet`, `TreeSet`, `LinkedHashSet`
- Generics: wildcards, bounded types, `PECS`
- `Comparable` vs. `Comparator`
- `Collections` utility class: sorting, shuffling, searching
- Writing your own generic data structures

#### 16. Java Streams and Functional Programming
*Runtime: Java*

- Lambda expressions and method references
- `Stream` API: `filter`, `map`, `flatMap`, `reduce`, `collect`
- `Optional` for null safety
- Custom `Collector` implementations
- `Spliterator` and parallel streams
- `CompletableFuture` and async pipelines
- Functional interfaces: `Function`, `Predicate`, `Consumer`, `Supplier`
- Records, sealed classes (Java 16–17)

#### 17. Java Concurrency
*Runtime: Java*

- Threads and the `Runnable`/`Callable` interfaces
- `ExecutorService` and thread pools
- `synchronized`, `volatile`, and the Java memory model
- `ReentrantLock`, `ReadWriteLock`, `StampedLock`
- `CountDownLatch`, `CyclicBarrier`, `Semaphore`
- `ConcurrentHashMap` and concurrent collections
- `CompletableFuture` chaining and exception handling
- Virtual threads (Project Loom, Java 21)

#### 18. Data Structures and Algorithms with Java
*Runtime: Java*

- Complexity analysis and Big-O notation
- Arrays, strings, and sliding-window problems
- Recursion and memoization
- Trees: BST operations, balanced trees, segment trees
- Graph algorithms: BFS, DFS, Dijkstra, Bellman-Ford
- Dynamic programming: knapsack, LCS, edit distance
- Sorting algorithms: merge sort, quick sort, radix sort
- Interview problem patterns: two pointers, backtracking, bit manipulation

---

### C# Track

#### 19. C# Fundamentals
*Runtime: C#*

- C# syntax, types, and control flow vs. Java/C++
- Value types vs. reference types; structs vs. classes
- Properties, auto-properties, and indexers
- Delegates, events, and the event pattern
- LINQ: query syntax vs. method syntax
- Nullable reference types (C# 8+)
- Pattern matching: `switch` expressions, `is`, `when`
- Records and init-only setters (C# 9+)

#### 20. C# LINQ and Functional Patterns
*Runtime: C#*

- LINQ operators: `Select`, `Where`, `GroupBy`, `Join`, `Aggregate`
- Deferred vs. immediate execution
- Custom LINQ extension methods
- IEnumerable and IQueryable differences
- Expression trees and runtime query building
- Functional patterns in C#: Option, Result, Railway-oriented programming
- Immutable collections in .NET
- Span<T> and Memory<T> for zero-copy processing

#### 21. C# Concurrency and Async
*Runtime: C#*

- Task Parallel Library (TPL): `Task`, `Task<T>`
- `async`/`await` mechanics and the state machine
- `CancellationToken` and cooperative cancellation
- `Parallel.For`, `Parallel.ForEach`
- Channels (`System.Threading.Channels`)
- `IAsyncEnumerable<T>` and async streams
- Deadlock avoidance patterns
- Benchmarking with BenchmarkDotNet

#### 22. Object-Oriented Design Patterns with C#
*Runtime: C#*

- SOLID principles with C# examples
- Creational: Factory Method, Abstract Factory, Builder, Singleton
- Structural: Adapter, Bridge, Composite, Decorator, Proxy
- Behavioral: Command, Observer, Strategy, Template Method, Visitor
- C#-specific patterns: Repository, Unit of Work, Specification
- Dependency injection and IoC containers
- Event-driven architecture with delegates and `EventArgs`

---

### R Track

#### 23. R for Statistical Analysis
*Runtime: R*

- R syntax, vectors, lists, data frames, factors
- Data manipulation with `dplyr`: filter, select, mutate, summarise, group_by
- Tidy data principles and `tidyr`: pivot_longer, pivot_wider
- Joining data frames: left_join, inner_join, full_join
- String manipulation with `stringr`
- Date/time handling with `lubridate`
- Descriptive statistics and the `summary()` ecosystem
- Writing reusable R functions and packages

#### 24. Data Visualization with R and ggplot2
*Runtime: R*

- Grammar of graphics: aesthetics, geoms, stats, scales, facets
- Common chart types: scatter, line, bar, histogram, boxplot, violin
- Customizing themes, color palettes, and labels
- Faceting: `facet_wrap`, `facet_grid`
- Combining plots with `patchwork`
- Interactive plots with `plotly::ggplotly`
- Mapping with `ggplot2` and `sf`
- Publication-quality figures: fonts, resolution, export

#### 25. Statistical Modeling with R
*Runtime: R*

- Linear regression: `lm()`, diagnostics, assumptions
- Logistic regression for classification
- ANOVA and ANCOVA
- Mixed effects models with `lme4`
- Time series: `ts`, `forecast`, ARIMA models
- Hypothesis testing: t-test, chi-square, Wilcoxon
- Bootstrap and permutation tests
- Model selection: AIC, BIC, cross-validation

#### 26. Machine Learning with R
*Runtime: R*

- `tidymodels` framework overview
- Preprocessing: `recipes` package
- Decision trees and random forests with `ranger`
- Gradient boosting with `xgboost`
- Support vector machines
- Cross-validation and hyperparameter tuning with `tune`
- Model evaluation: ROC-AUC, confusion matrix, calibration
- Unsupervised learning: k-means, hierarchical clustering, PCA

---

### PHP Track

#### 27. PHP Fundamentals
*Runtime: PHP*

- PHP syntax, variables, and data types
- Control flow: if/else, switch, match, loops
- Functions: named, anonymous, arrow functions
- Arrays: indexed, associative, multidimensional, array functions
- String manipulation: `str_*`, `sprintf`, regex
- File I/O and filesystem operations
- Error handling: exceptions, `try`/`catch`/`finally`
- PHP 8.x features: enums, fibers, named arguments, readonly properties

#### 28. Object-Oriented PHP
*Runtime: PHP*

- Classes, objects, constructors, destructors
- Visibility: public, protected, private
- Interfaces, abstract classes, traits
- Type declarations and strict types
- Magic methods: `__get`, `__set`, `__call`, `__toString`
- Late static binding
- Anonymous classes and closures
- Enums (PHP 8.1) and readonly classes (PHP 8.2)

---

### SQL — SQLite Track

#### 29. SQLite Fundamentals
*Runtime: SQLite*

- SQLite architecture: serverless, single-file, in-process
- Creating databases, tables, and constraints
- CRUD: SELECT, INSERT, UPDATE, DELETE
- Filtering: WHERE, BETWEEN, IN, LIKE, IS NULL
- Sorting: ORDER BY, NULLS FIRST/LAST
- Aggregation: GROUP BY, HAVING, COUNT, SUM, AVG, MIN, MAX
- Joins: INNER, LEFT, RIGHT (via UNION trick), CROSS
- SQLite-specific data types and type affinity

#### 30. Advanced SQLite Queries
*Runtime: SQLite*

- Subqueries: scalar, correlated, EXISTS
- Common Table Expressions (CTEs) and recursive CTEs
- Window functions: ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD
- Running totals and moving averages with window frames
- JSON functions: `json_extract`, `json_each`, `json_object`
- Full-text search with FTS5
- Virtual tables and the `generate_series` module
- Query optimization: EXPLAIN QUERY PLAN, indexes, ANALYZE

#### 31. SQLite for Application Development
*Runtime: SQLite*

- Schema design: normalization (1NF–3NF), denormalization trade-offs
- Indexes: B-tree, covering indexes, partial indexes, expression indexes
- Transactions: ACID properties, BEGIN/COMMIT/ROLLBACK, savepoints
- WAL mode and concurrent reads
- Triggers: BEFORE/AFTER INSERT/UPDATE/DELETE
- Views and updatable views
- Migrations: versioning schemas safely
- SQLite as an application file format

---

### SQL — PostgreSQL Track

#### 32. PostgreSQL Fundamentals
*Runtime: PostgreSQL*

- PostgreSQL vs. SQLite vs. MySQL: when to choose Postgres
- Data types: numeric, text, boolean, date/time, UUID, arrays, JSONB
- DDL: CREATE, ALTER, DROP TABLE; constraints (PK, FK, UNIQUE, CHECK, NOT NULL)
- DML: INSERT with RETURNING, UPDATE, DELETE, UPSERT with ON CONFLICT
- Transactions and isolation levels
- Roles, privileges, and schemas
- `EXPLAIN` and `EXPLAIN ANALYZE` query plans
- psql meta-commands and workflow

#### 33. Advanced PostgreSQL
*Runtime: PostgreSQL*

- Window functions: partitioning, framing, GROUPS mode
- Recursive CTEs for hierarchical data (org charts, bill of materials)
- Lateral joins and `LATERAL` subqueries
- JSONB operators, path queries, and GIN indexing
- Array operators and unnesting
- Full-text search: `tsvector`, `tsquery`, GIN indexes, ranking
- Partial indexes, expression indexes, and index-only scans
- Partitioning: range, list, hash; partition pruning

#### 34. PostgreSQL for Data Engineering
*Runtime: PostgreSQL*

- Bulk loading: COPY, INSERT … SELECT, foreign data wrappers
- Materialized views: creation, refresh strategies
- Table inheritance and partitioning for time-series data
- PL/pgSQL: stored procedures, functions, triggers
- Advisory locks and row-level locking patterns
- `pg_stat_*` views for performance monitoring
- Vacuuming, autovacuum tuning, and bloat management
- Logical replication concepts

#### 35. SQL Query Patterns and Optimization
*Runtime: PostgreSQL / SQLite*

- The logical order of SQL clause execution
- Anti-joins (NOT EXISTS vs. NOT IN vs. LEFT JOIN … IS NULL)
- Self-joins for hierarchical and sequence data
- Pivoting and unpivoting data (CASE WHEN, crosstab)
- Set operations: UNION, INTERSECT, EXCEPT with and without ALL
- Gaps-and-islands problems
- Top-N per group patterns
- Thinking in sets vs. procedural thinking

---

### SQL — DuckDB Track

#### 36. DuckDB for Analytical Queries
*Runtime: DuckDB*

- DuckDB's columnar, vectorized execution engine
- Reading CSV, Parquet, JSON directly with `read_csv_auto`, `read_parquet`
- Analytical aggregations: complex GROUP BY, GROUPING SETS, CUBE, ROLLUP
- Window functions for analytics: lag/lead, cumulative distributions
- ASOF joins for time-series alignment
- List, struct, and map types for nested data
- Lambda functions and list comprehensions in SQL
- PIVOT and UNPIVOT syntax

#### 37. DuckDB Data Engineering
*Runtime: DuckDB*

- DuckDB as an in-process OLAP engine vs. OLTP databases
- Ingesting and transforming large datasets in-browser
- Efficient data type casting and schema inference
- Sampling strategies: `USING SAMPLE`
- Regex functions and text analytics
- Date/time arithmetic and time zone handling
- Exporting results to JSON and Parquet
- Performance: explain plans, memory limits, parallelism settings

---

### Cross-Language / CS Fundamentals Track

#### 38. Discrete Mathematics for Programmers
*Runtime: Python*

- Sets, relations, and functions
- Boolean algebra and logic gates
- Proof techniques: direct, contradiction, induction
- Combinatorics: permutations, combinations, pigeonhole
- Graph theory: paths, cycles, trees, planarity
- Number theory: modular arithmetic, GCD, primality
- Recurrence relations and their solutions
- Introduction to formal languages and automata

#### 39. Computer Architecture Essentials
*Runtime: C*

- Binary, hexadecimal, and two's complement arithmetic
- Bitwise operators: AND, OR, XOR, NOT, shifts
- Integer overflow and undefined behavior in C
- Floating-point representation: IEEE 754, precision, NaN, Inf
- CPU pipeline stages: fetch, decode, execute, write-back
- Cache hierarchy: L1/L2/L3, cache lines, associativity
- Virtual memory: pages, TLB, page tables
- RISC vs. CISC architectures

#### 40. Operating Systems Concepts
*Runtime: C*

- Processes vs. threads: PCB, scheduling, context switch
- Process creation: `fork()`, `exec()`, `wait()`
- Inter-process communication: pipes, FIFOs, shared memory
- Synchronization: mutexes, semaphores, monitors
- Deadlock: conditions, detection, prevention, avoidance (Banker's algorithm)
- Memory management: segmentation, paging, virtual memory
- File systems: inodes, directories, journaling
- System calls and the kernel/user boundary

#### 41. Compiler Design and Interpreters
*Runtime: Python / C*

- Lexical analysis: tokens, regular expressions, finite automata
- Parsing: context-free grammars, LL and LR parsers
- Abstract Syntax Trees (ASTs) and tree walking
- Symbol tables and scope resolution
- Type checking and semantic analysis
- Intermediate representations (IR): three-address code, SSA
- Code generation and register allocation basics
- Building a mini interpreter in Python

#### 42. Networking Fundamentals for Developers
*Runtime: Python / C*

- The OSI and TCP/IP models
- IP addressing, subnetting, CIDR
- TCP: three-way handshake, flow control, congestion control
- UDP and when to use it
- DNS resolution step by step
- HTTP/1.1, HTTP/2, HTTP/3: headers, methods, status codes
- TLS: certificate chain, handshake, cipher suites
- Sockets programming: TCP echo server in C and Python

#### 43. Algorithms for Competitive Programming
*Runtime: C++ / Python*

- Complexity: time, space, amortized analysis
- Bit manipulation tricks and bitmask DP
- Number theory: sieve, modular exponentiation, Euler's totient
- Segment trees and Binary Indexed Trees (Fenwick trees)
- Suffix arrays and the Z-algorithm
- Network flow: Ford-Fulkerson, Dinic's algorithm
- Geometry: convex hull, line intersection, polygon area
- Game theory: Sprague-Grundy theorem, Nim

---

### Data Science & Analytics Track

#### 44. Introduction to Machine Learning
*Runtime: Python*

- Supervised vs. unsupervised vs. reinforcement learning
- Linear regression from scratch and with scikit-learn
- Logistic regression and decision boundaries
- Decision trees: splitting criteria, pruning
- Ensemble methods: bagging (Random Forest), boosting (XGBoost)
- Support vector machines and the kernel trick
- k-Nearest Neighbors and distance metrics
- Model evaluation: cross-validation, bias-variance trade-off

#### 45. Deep Learning Foundations
*Runtime: Python*

- Perceptrons and the universal approximation theorem
- Backpropagation: chain rule, gradient descent variants
- Activation functions: ReLU, sigmoid, tanh, GELU
- Convolutional neural networks (CNNs): convolutions, pooling
- Recurrent networks (RNNs, LSTMs, GRUs) for sequences
- Attention mechanism and the Transformer architecture
- Batch normalization, dropout, regularization
- Training tips: learning rate schedules, early stopping, gradient clipping

#### 46. SQL for Data Analysis
*Runtime: PostgreSQL / DuckDB / SQLite*

- Framing business questions as SQL queries
- Cohort analysis with window functions
- Funnel analysis using conditional aggregation
- Sessionization: partitioning event streams into sessions
- Customer lifetime value (CLV) with recursive CTEs
- A/B test analysis: significance, confidence intervals in SQL
- Star schema and snowflake schema: fact and dimension tables
- Slowly changing dimensions (SCD Types 1–3)

#### 47. Database Design and Normalization
*Runtime: PostgreSQL / SQLite*

- Entity-Relationship (ER) modeling and diagrams
- First through Fifth Normal Forms (1NF–5NF) with examples
- Denormalization trade-offs for read-heavy workloads
- Surrogate vs. natural keys
- One-to-many, many-to-many, self-referential relationships
- Soft deletes vs. hard deletes
- Audit tables and temporal data patterns (bi-temporal modeling)
- Designing schemas for e-commerce, social networks, and analytics

#### 48. Data Pipelines and ETL Concepts
*Runtime: Python / SQL*

- ETL vs. ELT: when to transform before or after loading
- Data quality checks: null rates, uniqueness, referential integrity
- Incremental loading patterns: watermarks, CDC
- Idempotency and retry safety in pipeline design
- Schema evolution strategies
- Data lineage and observability
- Working with large files: chunking, streaming
- Introduction to orchestration concepts (Airflow, dbt)

---

### Low-Level Programming Track

#### 49. Bit Manipulation and Binary Arithmetic
*Runtime: C / C++*

- Representing integers: unsigned, signed, two's complement
- Bitwise AND, OR, XOR, NOT and their uses
- Bit shifts: logical vs. arithmetic shifts
- Setting, clearing, toggling, and testing bits
- Bit manipulation tricks: isolate rightmost bit, count set bits
- Bitmasking for flags and permission systems
- Fixed-width integer types: `uint8_t`, `int32_t`, etc.
- Endianness: big-endian vs. little-endian, byte swapping

#### 50. Advanced C: Beyond the Basics
*Runtime: C*

- Function pointers and callbacks
- Flexible array members and variable-length arrays
- `restrict` keyword and aliasing rules
- Bit fields in structs
- `setjmp`/`longjmp` for non-local control flow
- The C preprocessor: macros, `#pragma`, include guards
- Linking: translation units, extern, static linkage, weak symbols
- Undefined behavior catalog and defensive coding

#### 51. Embedded Systems Concepts with C
*Runtime: C*

- Bare-metal vs. RTOS programming concepts
- Memory-mapped I/O and volatile registers
- Interrupt service routines (ISRs) and atomic operations
- Fixed-point arithmetic for systems without FPU
- Communication protocols: UART, SPI, I2C (software simulation)
- Watchdog timers and reset vectors
- Linker scripts and memory sections: `.text`, `.data`, `.bss`
- Writing portable, hardware-independent C code

---

### Web & Scripting Track

#### 52. PHP for Web Development
*Runtime: PHP*

- PHP request lifecycle and superglobals (`$_GET`, `$_POST`, `$_SESSION`)
- Form handling, validation, and sanitization
- PDO for database access: prepared statements, parameterized queries
- Sessions and cookies
- File uploads and security considerations
- REST API fundamentals with PHP
- Composer and dependency management
- PSR standards: PSR-4 autoloading, PSR-7 HTTP messages

#### 53. TypeScript for Full-Stack Development
*Runtime: TypeScript*

- TypeScript project configuration for Node.js backends
- Building REST API types with TypeScript interfaces
- Zod for runtime validation and type inference
- Type-safe database access patterns
- Advanced mapped types: `Readonly`, `DeepPartial`, conditional types
- Template literal types for URL/SQL string safety
- Module augmentation and declaration merging
- Migrating a JavaScript codebase to TypeScript incrementally

---

### Security & Correctness Track

#### 54. Secure Coding Practices
*Runtime: C / C++ / Python / PHP*

- Buffer overflows: stack and heap exploitation concepts
- Format string vulnerabilities
- Integer overflow and underflow pitfalls
- SQL injection: detection, prevention with parameterized queries
- Cross-site scripting (XSS) and output encoding
- Command injection and safe subprocess handling
- Memory safety in C: using AddressSanitizer
- Principles: least privilege, defense in depth, fail securely

#### 55. Testing and Test-Driven Development (TDD)
*Runtime: Python / Java / C# / JavaScript*

- Unit testing fundamentals: test pyramid, test doubles
- TDD cycle: Red → Green → Refactor
- Writing testable code: dependency injection, pure functions
- Property-based testing with Hypothesis (Python) / fast-check (JS)
- Mocking, stubbing, and faking collaborators
- Code coverage: statement, branch, path coverage
- Integration and end-to-end testing strategies
- Mutation testing for test quality measurement

---

## Summary Table

| # | Course Title | Primary Runtime | Track |
|---|-------------|----------------|-------|
| 1 | Python for Data Science | Python | Python |
| 2 | Python for Data Visualization | Python | Python |
| 3 | Python Concurrency and Async | Python | Python |
| 4 | Python Type System and Modern Python | Python | Python |
| 5 | Python Design Patterns | Python | Python |
| 6 | Scientific Computing with Python | Python | Python |
| 7 | JavaScript Fundamentals | JavaScript | JS/TS |
| 8 | TypeScript from Scratch | TypeScript | JS/TS |
| 9 | Functional Programming with JavaScript | JavaScript | JS/TS |
| 10 | Data Structures and Algorithms with JavaScript | JavaScript | JS/TS |
| 11 | Modern C++ (C++17/20/23) | C++ | C++ |
| 12 | C++ Template Metaprogramming | C++ | C++ |
| 13 | C++ Systems and Performance Programming | C++ | C++ |
| 14 | Game Development Fundamentals with C++ | C++ | C++ |
| 15 | Java Collections and Generics Deep Dive | Java | Java |
| 16 | Java Streams and Functional Programming | Java | Java |
| 17 | Java Concurrency | Java | Java |
| 18 | Data Structures and Algorithms with Java | Java | Java |
| 19 | C# Fundamentals | C# | C# |
| 20 | C# LINQ and Functional Patterns | C# | C# |
| 21 | C# Concurrency and Async | C# | C# |
| 22 | OOP Design Patterns with C# | C# | C# |
| 23 | R for Statistical Analysis | R | R |
| 24 | Data Visualization with R and ggplot2 | R | R |
| 25 | Statistical Modeling with R | R | R |
| 26 | Machine Learning with R | R | R |
| 27 | PHP Fundamentals | PHP | PHP |
| 28 | Object-Oriented PHP | PHP | PHP |
| 29 | SQLite Fundamentals | SQLite | SQL |
| 30 | Advanced SQLite Queries | SQLite | SQL |
| 31 | SQLite for Application Development | SQLite | SQL |
| 32 | PostgreSQL Fundamentals | PostgreSQL | SQL |
| 33 | Advanced PostgreSQL | PostgreSQL | SQL |
| 34 | PostgreSQL for Data Engineering | PostgreSQL | SQL |
| 35 | SQL Query Patterns and Optimization | PostgreSQL/SQLite | SQL |
| 36 | DuckDB for Analytical Queries | DuckDB | SQL |
| 37 | DuckDB Data Engineering | DuckDB | SQL |
| 38 | Discrete Mathematics for Programmers | Python | CS Fundamentals |
| 39 | Computer Architecture Essentials | C | CS Fundamentals |
| 40 | Operating Systems Concepts | C | CS Fundamentals |
| 41 | Compiler Design and Interpreters | Python/C | CS Fundamentals |
| 42 | Networking Fundamentals for Developers | Python/C | CS Fundamentals |
| 43 | Algorithms for Competitive Programming | C++/Python | CS Fundamentals |
| 44 | Introduction to Machine Learning | Python | Data Science |
| 45 | Deep Learning Foundations | Python | Data Science |
| 46 | SQL for Data Analysis | PostgreSQL/DuckDB | Data Science |
| 47 | Database Design and Normalization | PostgreSQL/SQLite | Data Science |
| 48 | Data Pipelines and ETL Concepts | Python/SQL | Data Science |
| 49 | Bit Manipulation and Binary Arithmetic | C/C++ | Low-Level |
| 50 | Advanced C: Beyond the Basics | C | Low-Level |
| 51 | Embedded Systems Concepts with C | C | Low-Level |
| 52 | PHP for Web Development | PHP | Web/Scripting |
| 53 | TypeScript for Full-Stack Development | TypeScript | Web/Scripting |
| 54 | Secure Coding Practices | C/C++/Python/PHP | Security |
| 55 | Testing and Test-Driven Development | Python/Java/C#/JS | Security |

**Total suggested courses: 55**
