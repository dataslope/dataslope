/**
 * What correlated predictors break, and what they do not.
 *
 * Two predictors, one outcome, and the correlation between the predictors swept
 * from zero to almost one. The two curves say opposite things, and both are
 * true.
 *
 * The *coefficient's* confidence interval blows up. At a predictor correlation
 * of 0.99 it is about seven times as wide as at zero, and the reason is that
 * the data no longer contains the comparison the coefficient is defined by. A
 * coefficient in a multiple regression is "the effect of moving this predictor
 * while holding the other fixed", and when the two move together there are
 * almost no observations where one moved and the other did not. The model is
 * being asked a question the data barely answers, and it says so honestly, in
 * the standard error.
 *
 * The model's *predictions* do not care at all. The out-of-sample error is flat
 * across the whole sweep. If two predictors carry the same information, it does
 * not matter to a prediction which of them gets the credit, and the fitted
 * values are the same either way.
 *
 * So the rule is about the question rather than about the model. If you want to
 * *predict*, collinearity is not a problem and dropping a variable to fix a
 * VIF is superstition that costs you information. If you want to *interpret* a
 * particular coefficient, collinearity is exactly the problem, and no amount of
 * data cleaning fixes it: you need variation where one predictor moves and the
 * other does not, which is a fact about the experiment rather than the fit.
 *
 * The tell that people miss: with collinear predictors, coefficients can flip
 * sign between two samples from the same population while the model's accuracy
 * is unchanged in both.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, linspace } from "./_theme.mjs";

export const title =
  "The width of a coefficient's confidence interval and the model's out-of-sample error, as the correlation between two predictors is swept from zero to 0.99. The interval widens sevenfold; the predictions do not change at all.";

const RHOS = linspace(0, 0.99, 60);

/** Variance inflation factor: 1/(1 - r squared) for two predictors. Interval
 *  width goes as its square root, and the prediction error does not depend on
 *  it at all. */
const ROWS = RHOS.map((rho) => {
  const vif = 1 / (1 - rho * rho);
  return {
    rho,
    width: Math.sqrt(vif),
    rmse: 1,
  };
});

const AT = (r) => ROWS.reduce((a, b) => (Math.abs(b.rho - r) < Math.abs(a.rho - r) ? b : a));
const HIGH = AT(0.99);
const MID = AT(0.9);

export const caption = `Two predictors whose correlation is swept from zero to 0.99. The coefficient's confidence interval ends up ${HIGH.width.toFixed(1)} times as wide, and is already ${MID.width.toFixed(1)} times as wide at 0.9, while out-of-sample error is flat across the whole sweep.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 138,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Correlation between the two predictors",
      labelAnchor: "center",
      domain: [0, 1],
      ticks: [0, 0.25, 0.5, 0.75, 0.9, 0.99],
      tickFormat: (v) => v.toFixed(2).replace(/0$/, ""),
    },
    y: {
      label: "Relative to no collinearity",
      domain: [0, 8],
      ticks: [1, 2, 4, 6, 8],
      tickFormat: (v) => `${v}×`,
    },
    marks: [
      Plot.ruleY([1], { stroke: GUIDE, strokeWidth: 1.4 }),
      Plot.areaY(ROWS, { x: "rho", y1: 1, y2: "width", fill: ACCENT, fillOpacity: 0.14, clip: true }),
      Plot.line(ROWS, { x: "rho", y: "width", stroke: ACCENT, strokeWidth: 2.4, clip: true }),
      Plot.line(ROWS, { x: "rho", y: "rmse", stroke: PRIMARY, strokeWidth: 2.4, clip: true }),
      Plot.text([HIGH], {
        x: "rho",
        y: "width",
        text: () => "width of the coefficient's\nconfidence interval",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{ rho: 1, rmse: 1 }], {
        x: "rho",
        y: "rmse",
        text: () => "out-of-sample\nprediction error",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.dot([MID, HIGH], { x: "rho", y: "width", r: 4.4, fill: ACCENT }),
      Plot.text([MID], {
        x: "rho",
        y: "width",
        text: (d) => `${d.width.toFixed(1)}× at r = 0.9`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0.34,
        y: 5.4,
        text: () => "to predict, this does not matter.\nto interpret one coefficient, it is the whole problem.",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
