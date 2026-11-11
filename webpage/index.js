import jsonfile from "jsonfile";
import simpleGit from "simple-git";
import moment from "moment";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(scriptDir, "data.json");
const planPath = path.join(scriptDir, "plan.json");
const git = simpleGit(scriptDir);

const SUPPORTED_DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY"];

/**
 * Parse a date string strictly in YYYY-MM-DD or DD/MM/YYYY format.
 */
const parseDate = (dateStr) => {
  const parsed = moment(dateStr, SUPPORTED_DATE_FORMATS, true);
  if (!parsed.isValid()) {
    throw new Error(
      `Invalid date "${dateStr}". Expected YYYY-MM-DD (e.g. 2026-09-01) or DD/MM/YYYY (e.g. 01/09/2026).`
    );
  }
  return parsed;
};

/**
 * Build a commit timestamp that stays on the target calendar day.
 */
const buildCommitTimestamp = (parsedDate, index, totalCount) => {
  if (totalCount <= 23) {
    return parsedDate.clone().hour(index).minute(0).second(0).format();
  }
  return parsedDate.clone().startOf("day").add(index, "seconds").format();
};

/**
 * Make local commits on a specific date (no auto-push).
 */
const commitOnDate = async (date, count = 1) => {
  if (!Number.isInteger(count) || count < 1 || count > 86399) {
    throw new Error(`Invalid commit count (${count}) for date "${date}". Use an integer between 1 and 86399.`);
  }

  const parsedDate = parseDate(date);

  for (let i = 1; i <= count; i++) {
    const commitDate = buildCommitTimestamp(parsedDate, i, count);

    await jsonfile.writeFile(dataPath, { date: commitDate });

    await git.add([dataPath]).commit(`Commit ${i} on ${parsedDate.format("YYYY-MM-DD")}`, {
      "--date": commitDate,
    });
    console.log(`✅ Local commit ${i}/${count} created on ${commitDate}`);
  }
};

/**
 * Read plan.json and create local commits for all configured dates.
 * Push manually with `git push` when ready.
 */
const makeCustomStreak = async () => {
  if (!fs.existsSync(planPath)) {
    console.error("❌ plan.json not found!");
    return;
  }

  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  if (!Array.isArray(plan) || plan.length === 0) {
    console.error("❌ plan.json must be a non-empty array of { date, count } entries.");
    return;
  }

  for (const { date, count = 1 } of plan) {
    await commitOnDate(date, count);
  }

  console.log("ℹ️ Local commits created. Auto-push is disabled—review with `git log` and run `git push` manually.");
};

makeCustomStreak().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exitCode = 1;
});
