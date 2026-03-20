// TypeScript diagnostic test
import type { Database } from "./src/lib/db/database.types";

// This should show what type structure we have
type TestProjects = Database["public"]["Tables"]["projects"];
type TestUsers = Database["public"]["Tables"]["users"];
type TestRenders = Database["public"]["Tables"]["renders"];

// Log to see if types exist
console.log("Types test compilation successful");

// Test if we can access Row types
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type RenderRow = Database["public"]["Tables"]["renders"]["Row"];

console.log("Row types accessible");
