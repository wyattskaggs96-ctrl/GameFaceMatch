import { validateProductionDirectory, formatReport } from "../../scripts/catalog-tools.mjs";

const productionDirectory = process.argv[2] ?? "../data/catalog/production";
const report = validateProductionDirectory(productionDirectory);
console.log(formatReport(report));
process.exitCode = report.ok ? 0 : 1;
