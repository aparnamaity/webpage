import jsonfile from "jsonfile";
import simpleGit from "simple-git";
import moment from "moment";
import fs from "fs";

const dataPath = "./data.json";
const planPath = "./plan.json";
const git = simpleGit();

/**
 * Make commits on a specific date
 */
const commitOnDate = async (date, count = 1) => {
  for (let i = 1; i <= count; i++) {
    const commitDate = moment(date).hour(i).minute(0).second(0).format();

    const data = { date: commitDate };
    await jsonfile.writeFile(dataPath, data);

    await git.add([dataPath]).commit(`Commit ${i} on ${date}`, {
      "--date": commitDate,
    });
    console.log(`✅ Commit ${i} created on ${commitDate}`);
  }
};

/**
 * Read plan.json & execute commits
 */
const makeCustomStreak = async () => {
  if (!fs.existsSync(planPath)) {
    console.error("❌ plan.json not found!");
    return;
  }

  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));

  for (const { date, count } of plan) {
    await commitOnDate(date, count);
  }

  // Push after all commits
  await git.push();
  console.log("🚀 All commits pushed successfully!");
};

makeCustomStreak();
