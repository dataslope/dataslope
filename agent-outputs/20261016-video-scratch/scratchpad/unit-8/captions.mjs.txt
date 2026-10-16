const root = "/home/user/dataslope/charts/";
for (const s of ["berksons-paradox","ecological-fallacy","simpsons-paradox-trend","regression-to-the-mean","cherry-picked-window","cherry-picked-window-zoom","effect-size-independent-of-n","effect-size-overlap"]) {
  try {
    const m = await import(root + s + ".mjs");
    console.log("==", s, "\n", m.caption);
  } catch (e) { console.log("ERR", s, e.message); }
}
const w = await import(root + "_wander.mjs");
console.log(w.WINDOW, w.WINDOW_PCT, w.DECADE_PCT, w.WINDOW_ROWS.map(r=>r.value.toFixed(2)), w.SERIES[0].value, w.SERIES[119].value);
