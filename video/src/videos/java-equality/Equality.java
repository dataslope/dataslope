// The code behind every listing, output and range in the "java-equality"
// video. measure.py compiles and runs it (OpenJDK 21) and writes
// measurements.json; data.ts reads that file, so nothing on screen is typed
// by hand. The lines between a "figN:begin" and "figN:end" marker are the
// listing printed in that figure, character for character.
public class Equality {
  static void show(String expr, boolean value) {
    System.out.println(expr + "\t" + value);
  }

  static void fig1() {
    // fig1:begin
    String a = "hi";
    String b = new String("hi");

    System.out.println(a == b);
    System.out.println(a.equals(b));
    // fig1:end
  }

  static void fig2() {
    // fig2:begin
    String a = "hi";
    String b = new String("hi");
    String c = "hi";
    String d = "HI".toLowerCase();
    // fig2:end
    show("a == c", a == c);
    show("a == b", a == b);
    show("a == d", a == d);
    show("b == d", b == d);
    show("a.equals(b)", a.equals(b));
    show("a.equals(d)", a.equals(d));
    // A literal is the interned copy: the pool's own object.
    show("a == \"hi\".intern()", a == "hi".intern());
  }

  static void fig3() {
    // fig3:begin
    Integer a = 127, b = 127;
    System.out.println(a == b);
    Integer x = 128, y = 128;
    System.out.println(x == y);
    System.out.println(x.equals(y));
    // fig3:end
  }

  /** The values autoboxing shares: for which ints do two boxings give one object? */
  static void cache() {
    int lo = Integer.MAX_VALUE, hi = Integer.MIN_VALUE, shared = 0;
    for (int i = -100_000; i <= 100_000; i++) {
      Integer p = i, q = i; // autoboxing, as in fig3
      if (p == q) {
        shared++;
        lo = Math.min(lo, i);
        hi = Math.max(hi, i);
      }
    }
    System.out.println("lo\t" + lo);
    System.out.println("hi\t" + hi);
    System.out.println("shared\t" + shared);
  }

  /** Since JDK 7 the string pool lives on the heap: interning a string built
   *  at run time stores that very heap object in the pool. */
  static void pool() {
    String built = new StringBuilder("java-").append("equality").toString();
    show("built.intern() == built", built.intern() == built);
  }

  public static void main(String[] args) {
    System.out.println("#version\t" + System.getProperty("java.version"));
    System.out.println("#vm\t" + System.getProperty("java.vm.name"));
    System.out.println("#fig1");
    fig1();
    System.out.println("#fig2");
    fig2();
    System.out.println("#fig3");
    fig3();
    System.out.println("#cache");
    cache();
    System.out.println("#pool");
    pool();
  }
}
