import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Designing objects" (16:9), Part 6 of the Backend / Software
 * Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md), after
 * content/interview/backend-engineer/object-oriented-design.mdx. It answers
 * all fifteen of the page's questions: eight worked through, numbered aloud
 * and read in the page's words, then seven quickly (9 to 15, numbered on
 * screen only).
 *
 *   1. "What are cohesion and coupling?" ("coh").
 *   2. "Why favor composition over inheritance?" ("comp").
 *   3. "What is the Liskov Substitution Principle in plain terms?" ("lsp").
 *   4. "Walk through the SOLID principles." ("solid").
 *   5. "What is the Dependency Inversion Principle, with an example?"
 *      ("dip").
 *   6. "What is the Strategy pattern?" ("strat").
 *   7. "What is the Observer pattern?" ("obs").
 *   8. "When does a design pattern become over-engineering?" ("over").
 *   Quick ("rapid-in"): 9. "What are the four pillars of OOP?"; 10. "What is
 *   encapsulation, concretely?"; 11. "Explain polymorphism with an
 *   example."; 12. "What is the Factory pattern, and when is it useful?";
 *   13. "What is the Singleton pattern, and why is it controversial?"; 14.
 *   "What is the difference between an abstract class and an interface?";
 *   15. "What is the "is-a" vs "has-a" distinction?"
 *
 * Every answer is argued on one small shop (a cart, orders, shipping,
 * notifications, an invoice), never through code: no listing appears on
 * screen. The page's own code, and a few lines of the video's own written to
 * the page's descriptions, run in check.mjs so that each claim about what a
 * design does is a run, and the figures draw the shop, not the classes.
 *
 * Opening: takes up the plan's bridge from Part 5 (code that has to keep
 * changing without breaking) as three change requests to one shop, without
 * naming the earlier video; each request comes back as an answer (the
 * loyalty count in 2, the text message in 2, the second shipping rule in 6
 * and 8). Close: the plan's bridge into Part 7 (most of the code you will be
 * asked about, you did not write).
 *
 * On screen, beat by beat (what phase 2 builds):
 *   hook        The shop's checkout as a row of boxes (cart, pay, invoice,
 *               email, stock), the armadillo hero beside it; three request
 *               cards arrive one by one: a second shipping rule, a text
 *               message, a loyalty count. Each card hovers between "new
 *               piece" and "edit".
 *   plan        Fifteen question chips: eight large, seven small.
 *   coh         Two gauges, cohesion (high is good) and coupling (low is
 *               good). "coh-god": one big OrderManager box holding five
 *               jobs, the multitool icon beside it. "coh-cost": five arrows
 *               into it, one per reason to change; the email arrow lights
 *               checkout red. "coh-split": the box breaks into five small
 *               ones joined by thin lines; the gauges swing. "coh-spot": two
 *               tallies on a class, reasons to change and things that change
 *               with it.
 *   comp        A parent box over a child box, a rigid bar between them.
 *               "comp-cart": the shopping-cart icon, three items going in
 *               through add, the loyalty counter at 3. "comp-break": the
 *               cart's add-all rewired to skip add; the counter reads 0
 *               (results.json: cart holds 3, counted 0), the loyalty box
 *               unchanged and marked "not edited". "comp-hold": the counter
 *               beside the cart with a "has a" link; before and after both
 *               3. "comp-mix": a 3 by 3 grid of subclass names (nine), then a
 *               fourth row (twelve); beside it, two short columns of parts,
 *               three channels and three timings (six, then seven); then
 *               one customer's timing part slides from "now" to "daily
 *               digest".
 *   lsp         A rectangle 2 by 3 and a square 3 by 3. "lsp-break": a
 *               caller sets width 5, height 4: the rectangle reads 20 (green),
 *               the square 16 (red). "lsp-rule": two arrows, "demand no
 *               more", "promise no less". "lsp-fix": square and rectangle as
 *               siblings under one shape, each with its own area.
 *   solid       Five letters down the left; each fills with its shop example
 *               as it is read: the invoice (one reason to change), a new
 *               shipping card snapping in (open-closed), the square back
 *               from question 3 (Liskov), the stock screen wired to a small
 *               read-only interface instead of a fat one with refunds
 *               (interface segregation), an arrow to the next question
 *               (dependency inversion). "solid-laws": the five letters dim
 *               to a single line, "guidelines, not laws".
 *   dip         The order confirmation box with a socket on its side.
 *               "dip-ex": the envelope icon (email sender) plugs in for
 *               production, a recording fake plugs in for the test; the fake
 *               shows one message, "Order 1042 confirmed" (results.json).
 *               "dip-plug": the plug icon and a wall socket. "dip-arrows":
 *               before, confirmation points at emailer; after, both point at
 *               the socket shape, which belongs to the confirmation.
 *   strat       A shipment box holding a swappable pricing card; the parcel
 *               icon. "strat-ship": flat rate 5, by weight 2 x 3 = 6 (the
 *               page's run). "strat-third": a third card, free above 10,
 *               slides in; the shipment box marked "not edited" (the run:
 *               5 at weight 3, 0 at 12). "strat-one": two cards fade to one,
 *               and the interface around it is struck as extra.
 *   obs         An order (subject) with three listeners on lines: email,
 *               stock, analytics, each lighting as "1042" reaches it.
 *               "obs-order": a fourth, loyalty points, joins; the order box
 *               marked "not edited" (results.json). "obs-cost": a reader's
 *               path through the checkout dead-ends at "notify", with the
 *               four listeners off to one side.
 *   over        Three stacks of boxes, each a pattern around one thing: a
 *               factory with one product, a strategy with one strategy, an
 *               observer with one listener; each extra layer struck.
 *               "over-trigger": the second shipping rule arriving, and only
 *               then the strategy interface drawn around both.
 *   rapid-in    Seven question chips, 9 to 15.
 *   r-pillars   Four pillars, one word each, with a one-line gloss.
 *   r-encap     An account with its balance inside a shell, two guarded
 *               doors; the constructor's door left unguarded admits -50
 *               (the run), then guarded.
 *   r-poly      A circle and a square each answering "area"; the total 7.14
 *               (the page's run), no type checks.
 *   r-factory   A counter that takes "csv" and hands back a parser; "xml"
 *               comes back "unknown parser" (the run).
 *   r-single    One config in the middle, everything wired to it; two tests
 *               run in order, the second failing on EUR, and alone, passing
 *               (the run).
 *   r-abstract  An interface as an empty outline; an abstract class as an
 *               outline with some parts filled in.
 *   r-isa       Car under vehicle (is a); car holding an engine (has a); car
 *               under engine, inheriting a list of engine controls, struck.
 *   next        A hairline and "Next: reading and reviewing code".
 *
 * Facts. check.mjs runs everything in Pyodide 314.0.7 (Python 3.14.2) into
 * results.json, which data.ts reads. The definitions, the god class, the
 * fragile base class, the Square and Rectangle, SOLID in five lines, the
 * three over-engineering examples, YAGNI, and all seven quick answers are
 * the page's own answers, heading by heading; the shop around them is the
 * video's own.
 *   - "comp-cart", "comp-break", "comp-hold": the video's own cart. A
 *     LoyaltyCart subclass counting in add() counts 3 for three items while
 *     the cart's add_all calls add; after add_all is changed to extend its
 *     list, the cart holds 3 and the subclass counts 0. A LoyaltyCounter
 *     holding a cart counts 3 before and after.
 *   - "comp-mix": three channels by three timings, 9 subclasses or 6 parts;
 *     with a fourth channel, 12 or 7 (itertools.product).
 *   - "lsp-break": the page's Rectangle (set_width, set_height) and a
 *     Square forcing width == height; a caller sets 5 then 4: 20 for the
 *     rectangle, 16 for the square. "lsp-rule": the page's "do not weaken
 *     guarantees or strengthen preconditions", in plain words.
 *   - "dip-ex": the page's Report with a fake sender: the fake records
 *     ['Order 1042 confirmed'] (the order number is the video's own).
 *   - "strat-ship": the page's block, 5.0 and 6.0, at a weight of 3 (the
 *     page gives no units, so the narration says none). "strat-third": a
 *     third class, free above a weight of 10, with Shipment unedited: 5.0 at
 *     3, 0.0 at 12.
 *   - "obs-order": the video's own order: three subscribers each hear
 *     order 1042; a fourth added later hears 1043, the Order class unedited.
 *   - "r-encap": the page's BankAccount, verbatim: an overdraft raises
 *     "insufficient funds", and the balance is read-only (AttributeError);
 *     but BankAccount(-50) opens at -50, and withdraw(-30) takes 100 to 130.
 *     The narration says the design rule (guard every way in, the
 *     constructor too); the report says the page overclaims.
 *   - "r-poly": the page's block, 7.14. "r-factory": the page's
 *     make_parser: "csv" gives a CsvParser, "xml" raises "unknown parser:
 *     xml". "r-single": the video's own config singleton: the default
 *     currency test passes alone and fails after a test that set EUR.
 *   - "dip-plug" (a lamp's plug and socket) and the god class as a
 *     multitool are the video's images, not claims.
 *
 * Written for Drew's ear: initialisms as people write them. SOLID and YAGNI
 * are said as words; OOP, UI and CSV letter by letter. YAGNI is expanded
 * once, as the page does. No class or method name is read as code: "add",
 * "add-all" and "total area" are said as the shop's words. No sentence opens
 * with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "be-object-design",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A small shop's checkout works. Then the business asks for a second shipping rule, a text message beside the confirmation email, and a count for the loyalty program.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-ask",
      text: "Each request is small. Whether it lands as a new piece, or as an edit to code that already works, depends on how the objects were drawn.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Fifteen questions on object-oriented design, argued on that one shop. Eight get a figure each, and seven go quickly at the end.",
      pauseAfter: 0.7,
    },

    // ── 1. Cohesion and coupling ──────────────────────────────────────────
    {
      id: "coh",
      scene: true,
      text: "Question one. What are cohesion and coupling? Cohesion is how focused a class is: its methods and data all serve one clear purpose. Coupling is how much modules depend on each other. Low coupling means a change in one rarely forces a change in another.",
      pauseAfter: 0.7,
    },
    {
      id: "coh-god",
      text: "Here's the anti-pattern. One order manager prices the cart, charges the card, writes the invoice, sends the email and updates the stock. It's a god class, a pocketknife with a blade for everything.",
      pauseAfter: 0.6,
    },
    {
      id: "coh-cost",
      text: "That's five reasons to change in one class, and everything that touches an order depends on all five. A new email template means retesting checkout.",
      pauseAfter: 0.6,
    },
    {
      id: "coh-split",
      text: "Split it into five focused pieces, each with one job and a narrow connection to the rest: high cohesion, low coupling. Most of SOLID pushes this way.",
      pauseAfter: 0.6,
    },
    {
      id: "coh-spot",
      text: "To spot one in a review, count a class's reasons to change, and count what has to change with it.",
      pauseAfter: 0.8,
    },

    // ── 2. Composition over inheritance ───────────────────────────────────
    {
      id: "comp",
      scene: true,
      text: "Question two. Why favor composition over inheritance? Inheritance ties a subclass to its parent's implementation, so a change upstream can break it. That's the fragile base class problem.",
      pauseAfter: 0.6,
    },
    {
      id: "comp-cart",
      text: "The shop's loyalty program extends the shopping cart, and counts each item as it's added. The cart's add-all adds them one at a time, so three items count three.",
      pauseAfter: 0.5,
    },
    {
      id: "comp-break",
      text: "Then the cart team speeds add-all up, and it stops adding them one at a time. The count for those three drops to zero, and nobody touched the loyalty code.",
      pauseAfter: 0.8,
    },
    {
      id: "comp-hold",
      text: "Composition holds a cart and delegates to it, counting in its own methods. It relies only on what the cart promises: three before the change, three after.",
      pauseAfter: 0.6,
    },
    {
      id: "comp-mix",
      text: "It also combines freely. Notifications go by email, text or push, and now, in a daily digest, or after quiet hours. A subclass per pair is nine, and a fourth channel makes twelve. Composition gives each notifier one channel and one timing: six parts, then seven. A customer who switches to the digest swaps one part, at runtime.",
      pauseAfter: 0.6,
    },
    {
      id: "comp-when",
      text: "Keep inheritance for a genuine subtype. Which raises what makes one genuine.",
      pauseAfter: 0.8,
    },

    // ── 3. Liskov substitution ────────────────────────────────────────────
    {
      id: "lsp",
      scene: true,
      text: "Question three. What is the Liskov substitution principle, in plain terms? A subclass must be usable anywhere its parent is expected, without surprising the caller.",
      pauseAfter: 0.6,
    },
    {
      id: "lsp-square",
      text: "The classic trap is a square that subclasses a rectangle. It keeps its sides equal, so setting its width sets its height too.",
      pauseAfter: 0.5,
    },
    {
      id: "lsp-break",
      text: "Code written for rectangles sets the width to five, then the height to four, and expects an area of twenty. Hand it a square, and it gets sixteen.",
      pauseAfter: 0.8,
    },
    {
      id: "lsp-rule",
      text: "So a subclass mustn't demand more of its callers, or promise them less.",
      pauseAfter: 0.6,
    },
    {
      id: "lsp-fix",
      text: "And the fix isn't a cleverer square. Don't make a square a kind of resizable rectangle: shapes that can't be resized, or two siblings that each work out their own area, both keep every promise.",
      pauseAfter: 0.8,
    },

    // ── 4. SOLID ──────────────────────────────────────────────────────────
    {
      id: "solid",
      scene: true,
      text: "Question four. Walk through the SOLID principles. Single responsibility: a class has one reason to change. The invoice changes only when its layout does.",
      pauseAfter: 0.5,
    },
    {
      id: "solid-o",
      text: "Open-closed: open for extension, closed for modification. A new shipping option arrives as new code, not as an edit to what works.",
      pauseAfter: 0.5,
    },
    {
      id: "solid-l",
      text: "Liskov substitution: subtypes stand in for their base type, which the square couldn't.",
      pauseAfter: 0.5,
    },
    {
      id: "solid-i",
      text: "Interface segregation: many small interfaces over one fat one. The stock screen only reads stock, so it shouldn't depend on an interface that also issues refunds.",
      pauseAfter: 0.5,
    },
    {
      id: "solid-d",
      text: "And dependency inversion: depend on abstractions, and inject the concrete pieces. That's the next question.",
      pauseAfter: 0.6,
    },
    {
      id: "solid-laws",
      text: "They're guidelines for low coupling and high cohesion, not laws. Applied everywhere, they produce the over-engineering this video ends on.",
      pauseAfter: 0.8,
    },

    // ── 5. Dependency inversion ───────────────────────────────────────────
    {
      id: "dip",
      scene: true,
      text: "Question five. What is the dependency inversion principle, with an example? High-level code depends on an abstraction, and the concrete implementation is passed in.",
      pauseAfter: 0.6,
    },
    {
      id: "dip-ex",
      text: "The order confirmation needs something that can send a message, and that's all it knows. In production, it's handed the email sender. A test hands it a fake that only records what it was asked to send, and checks the message with no mail server.",
      pauseAfter: 0.6,
    },
    {
      id: "dip-plug",
      text: "It's a lamp with a plug, instead of wires run into the wall. The socket is the abstraction, and anything that fits it works.",
      pauseAfter: 0.6,
    },
    {
      id: "dip-arrows",
      text: "The inversion is in the arrows. The confirmation no longer points at the emailer; the emailer fits the shape the confirmation asked for. Policy stops depending on detail.",
      pauseAfter: 0.8,
    },

    // ── 6. Strategy ───────────────────────────────────────────────────────
    {
      id: "strat",
      scene: true,
      text: "Question six. What is the Strategy pattern? It puts interchangeable algorithms behind one interface, and lets the caller pick one at runtime, instead of a sprawling if-else.",
      pauseAfter: 0.5,
    },
    {
      id: "strat-ship",
      text: "A shipment holds a pricing strategy and asks it for the cost. For a parcel weighing three, the flat rate says five. Pricing by weight, at two a unit, says six.",
      pauseAfter: 0.6,
    },
    {
      id: "strat-third",
      text: "A third rule, free above a weight of ten, is a new class. The shipment isn't edited: that's open-closed.",
      pauseAfter: 0.6,
    },
    {
      id: "strat-one",
      text: "With only one rule, though, the interface is just indirection. A plain function does the job until a second rule really arrives.",
      pauseAfter: 0.8,
    },

    // ── 7. Observer ───────────────────────────────────────────────────────
    {
      id: "obs",
      scene: true,
      text: "Question seven. What is the Observer pattern? A one-to-many dependency: when a subject changes state, it notifies every observer that registered.",
      pauseAfter: 0.5,
    },
    {
      id: "obs-order",
      text: "An order is placed. The email, the stock count and the analytics have each subscribed, and each one hears about it. The order doesn't know their types, so a fourth, for loyalty points, joins without an edit to the order.",
      pauseAfter: 0.6,
    },
    {
      id: "obs-use",
      text: "It underpins event systems, UI data binding, and publish-subscribe.",
      pauseAfter: 0.5,
    },
    {
      id: "obs-cost",
      text: "The cost is indirection. Reading the checkout no longer tells you what happens after an order; you have to go and find who subscribed.",
      pauseAfter: 0.8,
    },

    // ── 8. Over-engineering ───────────────────────────────────────────────
    {
      id: "over",
      scene: true,
      text: "Question eight. When does a design pattern become over-engineering? When it adds indirection without a need to match.",
      pauseAfter: 0.5,
    },
    {
      id: "over-ex",
      text: "A factory for a class that will only ever have one implementation. A strategy interface with one strategy. An observer with one hard-coded listener. Each is abstraction you have to read through, for flexibility nobody uses.",
      pauseAfter: 0.6,
    },
    {
      id: "over-yagni",
      text: "Patterns solve variation you expect. Added speculatively, they break YAGNI: you aren't gonna need it.",
      pauseAfter: 0.6,
    },
    {
      id: "over-trigger",
      text: "So in an interview, name the trigger rather than the pattern. The second shipping rule is the day the strategy earns its interface. Reach for a pattern when the duplication, or the pressure to change, is real.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Seven more, a sentence or two each.", pauseAfter: 0.5 },
    {
      id: "r-pillars",
      text: "The four pillars of OOP. Encapsulation bundles data with its methods and hides the state. Inheritance reuses and specializes a class. Polymorphism gives one call the right behavior for each type. Abstraction shows what an object does, not how.",
      pauseAfter: 0.6,
    },
    {
      id: "r-encap",
      text: "Encapsulation, concretely: an account hides its balance and changes it only through methods that check, so no withdrawal can overdraw it. Guard every way in, the constructor too. An account that opens at minus fifty is overdrawn already.",
      pauseAfter: 0.6,
    },
    {
      id: "r-poly",
      text: "Polymorphism, by example: total area asks each shape for its own area, a circle and a square alike, with no ladder of type checks.",
      pauseAfter: 0.6,
    },
    {
      id: "r-factory",
      text: "A factory centralizes creation, so callers ask for what they want, like a parser for CSV, not how to build it. It pays off when the class depends on runtime input, or construction is complex.",
      pauseAfter: 0.6,
    },
    {
      id: "r-single",
      text: "A singleton is one instance with a global access point, like a config. It's controversial as global mutable state: it hides dependencies, and a test that passes alone can fail after one that changed the config. A module-level value or plain injection is often cleaner.",
      pauseAfter: 0.6,
    },
    {
      id: "r-abstract",
      text: "An interface declares what methods a type must provide, with no implementation. An abstract class can also share code and state. Use an interface for a pure contract, and an abstract class when subclasses share code.",
      pauseAfter: 0.6,
    },
    {
      id: "r-isa",
      text: "And is-a versus has-a. A car is a vehicle: inheritance. A car has an engine: composition. Make car extend engine, and it inherits the engine's whole interface. Ask which it is before you inherit.",
      pauseAfter: 1.0,
    },
    {
      id: "next",
      text: "Every answer here assumed you were the one writing the code.",
      pauseAfter: 0.6,
    },
    {
      id: "next-read",
      text: "Most of the code you'll be asked about, you didn't write. Next: reading and reviewing code.",
    },
  ],
};
