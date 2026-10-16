import { WebR } from "/home/user/dataslope/node_modules/webr/dist/webr.mjs";
const webR = new WebR({ interactive: false });
await webR.init();
const out = await webR.evalRString(`paste(capture.output({
  print(ftable(UCBAdmissions, row.vars = c("Dept","Gender")))
}), collapse = "\\n")`);
console.log(out);
process.exit(0);
