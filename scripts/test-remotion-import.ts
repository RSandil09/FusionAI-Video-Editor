import { bundle } from "@remotion/bundler";
import path from "path";

console.log("Attempting to import bundle...");
try {
	console.log("Bundle function found:", typeof bundle);
	console.log("Success!");
} catch (e) {
	console.error("Error importing bundle:", e);
}
