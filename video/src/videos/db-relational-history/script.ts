import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Where it came from" (16:9), Unit 9 of Database Design with
 * PostgreSQL and the course's last video: one video for the unit's two
 * lessons, told as one history in two parts that each lead into the next.
 *
 *   1. The relational revolution ("hook" to "berkeley-in"), after
 *      the-relational-revolution.mdx: navigational databases and why
 *      programs broke, Codd's 1970 paper and data independence, IBM's
 *      reluctance, System R and SEQUEL becoming SQL, Boyce, and Oracle
 *      shipping first. It opens on Unit 8's bridge, none of this was obvious
 *      once, and it started with one paper in 1970.
 *   2. From Ingres to PostgreSQL ("ingres" to "close"), after
 *      from-ingres-to-postgresql.mdx: Ingres and its free source,
 *      POSTGRES, Postgres95, the rename, PGlite, and why the engine is
 *      strict. It closes the course, with no NextLine.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts from a run. Every table, SQL statement, reply and error on screen ran in
 * PGlite 0.5.8 (PostgreSQL 18.3 in WASM) by check.mjs into results.json,
 * which data.ts reads, on the lesson's own tables (its 24 customers and 30
 * orders, "Connected by value, not by pointer"):
 *   - Ada is customer 1, and her orders are 101 (15.00) and 125 (31.00), the
 *     lesson's query's answer; the tree and the tables draw customers 1 to 3
 *     and their six orders;
 *   - CLUSTER rewrites orders in a new physical order: all six rows drawn
 *     move (101 from block 0 slot 1 to slot 30, 125 from slot 25 to 22), and
 *     the same query returns the same two rows, in the same order;
 *   - SELECT version() answers "PostgreSQL 18.3 (PGlite 0.5.8) on
 *     wasm32-unknown-emscripten, ...";
 *   - SELECT * FROM orders WHERE customer_id = 1 returns Ada's two orders
 *     (Fig. 6's SQL, beside the same question in POSTQUEL);
 *   - an order for customer 25 is refused: insert or update on table
 *     "orders" violates foreign key constraint "orders_customer_id_fkey"
 *     (23503), Key (customer_id)=(25) is not present in table "customers".
 *
 * Facts from sources (the lessons' claims, each checked):
 *   - IMS was built to track rocket parts for Apollo: Rockwell was prime
 *     contractor for the Saturn V's second stage, the system "tracked bills
 *     of material for millions of parts", first shipped 1967 (IBM,
 *     "Information Management System", ibm.com/history). It stored records
 *     as a tree navigated parent to child.
 *   - CODASYL's network model: a query was "a program that navigated through
 *     a network of pointers to find the desired information" (Chamberlin,
 *     "Early History of SQL", IEEE Annals of the History of Computing 34(4),
 *     2012, p. 78).
 *   - E. F. "Ted" Codd, born 1923 in Dorset, England, studied mathematics and
 *     chemistry at Oxford; "A Relational Model of Data for Large Shared Data
 *     Banks", Communications of the ACM 13(6), June 1970, pp. 377 to 387,
 *     from the IBM Research Laboratory, San Jose (the paper's own masthead).
 *     Its first sentence is the pull quote: "Future users of large data
 *     banks must be protected from having to know how the data is organized
 *     in the machine (the internal representation)." The video stops at
 *     "machine" and marks the cut with an ellipsis. Its section 1.2.1 names
 *     "ordering dependence", the shuffle the video runs. Turing Award 1981
 *     (ACM).
 *   - System R at IBM San Jose: Chamberlin and Boyce joined it in 1973 and
 *     designed SEQUEL ("SEQUEL: A Structured English Query Language", ACM
 *     SIGFIDET workshop, Ann Arbor, May 1974); "because of a trademark
 *     issue, the name Sequel was shortened to SQL" (Chamberlin 2012). The
 *     mark's holder is the lesson's "aircraft company": Chamberlin names
 *     "the Hawker Siddeley Aircraft Company in Great Britain" in "The 1995
 *     SQL Reunion" (SRC Technical Note 1997-018, System R section), though
 *     his 2012 article does not. System R proved the model could be fast
 *     (Chamberlin et al., "A History and Evaluation of System R", CACM
 *     24(10), 1981).
 *   - Boyce died in June 1974 of a brain aneurysm, about a month after
 *     presenting SEQUEL; Chamberlin gives his age as 26, Wikipedia (born
 *     27 August 1946) as 27, so the video says "in his twenties", as the
 *     lesson does. Boyce–Codd normal form, 1974.
 *   - Oracle (Relational Software, Inc., later renamed after its product)
 *     shipped Oracle V2 in 1979, the first commercial SQL database; IBM's
 *     SQL/DS followed in 1981 and DB2 in 1983.
 *   - Ingres: Stonebraker and Wong began it at Berkeley in 1973 after reading
 *     Codd's papers; QUEL; its source was available on tape for a nominal
 *     fee; Robert Epstein, its chief programmer, co-founded Sybase (1984),
 *     whose SQL Server Microsoft licensed, shipping SQL Server 1.0 in 1989
 *     (Wikipedia, "Ingres (database)", "Sybase").
 *   - POSTGRES: "the successor to the INGRES relational database system",
 *     built for "user extendibility for data types", named "POSTGRES (POST
 *     inGRES)" (Stonebraker and Rowe, "The Design of POSTGRES", ERL memo
 *     M85/95); implementation began in 1986 (PostgreSQL documentation,
 *     "A Brief History of PostgreSQL"); its language was POSTQUEL. The same
 *     memo dates Ingres's implementation to 1975 to 1977. Fig. 6's two
 *     asides come from it too: "A conventional DBMS has a small set of
 *     built-in data types", its own built-ins being "integers, floating
 *     point, fixed length character strings", while applications need
 *     "geometric data types for CAD/CAM or a latitude and longitude position
 *     data type"; and POSTQUEL keeps QUEL's retrieve, as in its own
 *     "retrieve (POLYGON.all) where POLYGON.id = 10", which the video writes
 *     against the lesson's orders. The SQL twin beside it ran in check.mjs.
 *   - "In 1994, Andrew Yu and Jolly Chen added an SQL language interpreter
 *     to POSTGRES", released as Postgres95; "By 1996 ... we chose a new
 *     name, PostgreSQL", with version numbers starting at 6.0 (the same
 *     history page). 6.0 itself shipped on 29 January 1997.
 *   - "PostgreSQL is pronounced Post-Gres-Q-L"; Postgres is its nickname
 *     (PostgreSQL wiki FAQ). Stonebraker won the 2014 Turing Award.
 *   - The upbringing beat (a lab and volunteers, a habit of saying no) and
 *     the closing line are from-ingres-to-postgresql's own "Why this matters
 *     to your designs", said as the lesson says them.
 *
 * Written for Drew, the course's narrator: casual and curious, short spoken
 * sentences, no symbols or parentheses, years as spoken, contractions,
 * questions the next sentence answers, an ellipsis where a speaker would
 * hold, and two capitalised stresses. Names a voice could misread are
 * written as said: "Sequel", "Postgres", "S-Q-L" where the letters are the
 * point, and the official name spelled out in syllables; the screen sets
 * them as written.
 */
export const script: NarrationScript = {
  id: "db-relational-history",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.8,
  beats: [
    // ── Part 1. The relational revolution ─────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every table in this course, every key, every join... none of it was obvious once.",
      pauseAfter: 0.35,
    },
    { id: "paper", text: "It all started with one paper, in nineteen seventy. So what came before it?" },

    {
      id: "trees",
      scene: true,
      text: "In the sixties, data lived in trees. IBM's IMS, built to track parts for the Saturn Five rocket, filed each record under its parent.",
      pauseAfter: 0.35,
    },
    { id: "walk", text: "Want Ada's orders? A program starts at the top and follows pointers down.", pauseAfter: 0.35 },
    {
      id: "route",
      text: "Network databases made the tree a web, but the rule held. The program had to know the ROUTE.",
      pauseAfter: 0.4,
    },
    { id: "broke", text: "So reorganize the file... and every program that walked it breaks." },

    {
      id: "codd",
      scene: true,
      text: "Then, in June nineteen seventy, Ted Codd, a British-born mathematician at IBM, published an idea that sounds almost too plain.",
      // A breath on the idea before the tables arrive under "Keep".
      pauseAfter: 0.8,
    },
    {
      id: "values",
      text: "Keep the data in tables, and link rows by value, not by pointer. Order one-oh-one is Ada's because it holds her number, one.",
      pauseAfter: 0.4,
    },
    {
      id: "shuffle",
      text: "So the database can store rows any way it likes. Shuffle them on disk, ask again... the SAME two orders.",
      pauseAfter: 0.4,
    },
    {
      id: "independence",
      text: "Codd called that data independence. A program says what it wants... not where to walk.",
      // Holds Codd's first sentence, which is shown and not read aloud, long
      // enough to read before the scene changes.
      pauseAfter: 2.4,
    },

    {
      id: "doubt",
      scene: true,
      text: "IBM wasn't sold. IMS made it a fortune, and critics doubted matching values could ever be fast.",
      pauseAfter: 0.3,
    },
    { id: "systemr", text: "So its San Jose lab built System R, to find out. It could.", pauseAfter: 0.45 },
    {
      id: "sequel",
      text: "Along the way, Donald Chamberlin and Raymond Boyce wrote a query language that reads almost like English. They called it Sequel.",
      pauseAfter: 0.35,
    },
    {
      id: "vowels",
      text: "Trouble was, an aircraft company already owned that name. So out went the vowels... S-Q-L.",
      pauseAfter: 0.5,
    },
    {
      id: "boyce",
      text: "Boyce died in nineteen seventy-four, still in his twenties. His name lives on in Boyce-Codd normal form.",
    },

    {
      id: "oracle",
      scene: true,
      text: "Here's the twist. IBM published that work, and a small California company read it closely. In seventy-nine, its Oracle was the first SQL database you could buy.",
      pauseAfter: 0.4,
    },
    { id: "ibm", text: "IBM's own arrived in eighty-one... the year Codd won the Turing Award.", pauseAfter: 0.6 },
    {
      id: "berkeley-in",
      text: "But IBM wasn't the only one reading Codd.",
      // Holds the retitled Fig. 4 and the Berkeley lane's "QUEL, not SQL".
      pauseAfter: 2.0,
    },

    // ── Part 2. From Ingres to PostgreSQL ─────────────────────────────────
    {
      id: "ingres",
      scene: true,
      text: "At Berkeley, Michael Stonebraker and Eugene Wong built a relational system of their own, called Ingres.",
      pauseAfter: 0.35,
    },
    { id: "tape", text: "Its code went out for the cost of a tape.", pauseAfter: 0.7 },
    {
      id: "industry",
      text: "And its people seeded an industry... Sybase, and from it, Microsoft SQL Server.",
      // Holds the finished family tree: the card lines under Sybase and SQL
      // Server are on screen, not read aloud.
      pauseAfter: 2.2,
    },

    {
      id: "postgres",
      scene: true,
      text: "In eighty-six, Stonebraker started over, on a database you could extend with your own types. He called it Postgres... as in, after Ingres.",
      pauseAfter: 0.4,
    },
    { id: "quirk", text: "One catch. It didn't speak SQL, and SQL had won.", pauseAfter: 0.35 },
    {
      id: "yu",
      text: "So in ninety-four, two grad students, Andrew Yu and Jolly Chen, gave it SQL. Hello, Postgres ninety-five.",
      pauseAfter: 0.4,
    },
    {
      id: "rename",
      text: "Volunteers kept it going, and in ninety-six renamed it. Officially, post-gres-cue-ell... but most of us just say Postgres.",
    },

    {
      id: "tab",
      scene: true,
      text: "Compile it to WebAssembly, and you get PGlite, Postgres running right in your browser. It's run every query in this course.",
      pauseAfter: 0.35,
    },
    { id: "version", text: "Ask it who it is, and it tells you. Postgres eighteen point three.", pauseAfter: 0.45 },
    {
      id: "upbringing",
      text: "And it kept its upbringing. Raised in a lab and then by volunteers, not a sales team, it says no to rows that break your rules.",
      pauseAfter: 0.8,
    },
    {
      id: "refuse",
      text: "Ask it to store an order for customer twenty-five, who doesn't exist... and it refuses.",
      pauseAfter: 0.9,
    },
    {
      id: "close",
      text: "It's easier to design carefully on a database that takes your rules seriously... and now you know why this one does.",
    },
  ],
};
