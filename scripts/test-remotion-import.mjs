import { bundle } from "@remotion/bundler";
import path from "path";

console.log("Attempting to import bundle...");
try {
	console.log("Bundle function found:", typeof bundle);
	if (typeof bundle === "function") {
		console.log("Success: bundle is a function");
	} else {
		console.error("Failure: bundle is", typeof bundle);
	}
} catch (e) {
	console.error("Error importing bundle:", e);
}
