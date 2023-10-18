const core = require("@actions/core");
const github = require("@actions/github");
const matchAll = require("match-all");
const Octokit = require("@octokit/rest");
// todo: any type has to be added to prevent compilation error, despite libs being correctly typed
async function extractJiraKeysFromCommit() {
  // temporary use this method instead of debugging the old one
  const prefix = core.getInput("prefix") ?? "LSN"; // TODO remove this default value
  const result = allMatches(prefix, await findStrings());
  const resultStr = Array.from(result)?.[0]
  core.setOutput("jira-keys", resultStr);

  // try {
  //   const regex = /((([A-Z]+)|([0-9]+))+-\d+)/g;
  //   const isPullRequest = core.getInput("is-pull-request") == "true";
  //   // console.log("isPullRequest: " + isPullRequest);
  //   const commitMessage = core.getInput("commit-message");
  //   // console.log("commitMessage: " + commitMessage);
  //   // console.log("core.getInput('parse-all-commits'): " + core.getInput('parse-all-commits'));
  //   const parseAllCommits = core.getInput("parse-all-commits") == "true";
  //   // console.log("parseAllCommits: " + parseAllCommits);
  //   const payload = github.context.payload;
  //
  //   const token = process.env["GITHUB_TOKEN"];
  //   const octokit = new Octokit({
  //     auth: token,
  //   });
  //
  //   if (isPullRequest) {
  //     let resultArr: any = [];
  //
  //     // console.log("is pull request...");
  //
  //     const owner = payload.repository?.owner.login;
  //     const repo = payload.repository?.name;
  //     const prNum = payload.number;
  //
  //     const { data } = await octokit.pulls.listCommits({
  //       owner: owner,
  //       repo: repo,
  //       pull_number: prNum,
  //     });
  //
  //     data.forEach((item: any) => {
  //       const commit = item.commit;
  //       const matches: any = matchAll(commit.message, regex).toArray();
  //       matches.forEach((match: any) => {
  //         if (resultArr.find((element: any) => element == match)) {
  //           // console.log(match + " is already included in result array");
  //         } else {
  //           // console.log(" adding " + match + " to result array");
  //           resultArr.push(match);
  //         }
  //       });
  //     });
  //
  //     const result = resultArr.join(",");
  //     core.setOutput("jira-keys", result);
  //   } else {
  //     // console.log("not a pull request");
  //
  //     if (commitMessage) {
  //       // console.log("commit-message input val provided...");
  //       const matches = matchAll(commitMessage, regex).toArray();
  //       const result = matches.join(",");
  //       core.setOutput("jira-keys", result);
  //     } else {
  //       // console.log("no commit-message input val provided...");
  //       const payload = github.context.payload;
  //
  //       if (parseAllCommits) {
  //         // console.log("parse-all-commits input val is true");
  //         let resultArr: any = [];
  //
  //         payload.commits.forEach((commit: any) => {
  //           const matches = matchAll(commit.message, regex).toArray();
  //           matches.forEach((match: any) => {
  //             if (resultArr.find((element: any) => element == match)) {
  //               // console.log(match + " is already included in result array");
  //             } else {
  //               // console.log(" adding " + match + " to result array");
  //               resultArr.push(match);
  //             }
  //           });
  //         });
  //
  //         const result = resultArr.join(",");
  //         core.setOutput("jira-keys", result);
  //       } else {
  //         // console.log("parse-all-commits input val is false");
  //         // console.log("head_commit: ", payload.head_commit);
  //         const matches = matchAll(
  //           payload.head_commit.message,
  //           regex,
  //         ).toArray();
  //         const result = matches.join(",");
  //         core.setOutput("jira-keys", result);
  //       }
  //     }
  //   }
  // } catch (error) {
  //   core.setFailed(error.message);
  // }
}

(async function () {
  await extractJiraKeysFromCommit();
  // console.log("finished extracting jira keys from commit message");
})();

function allMatches(prefix: string, strings: Iterable<string>) {
  const result = new Set<string>();
  for (const string of strings) {
    const regex = new RegExp(`(${prefix}-\\d+)`, "g");
    const matches = matchAll(string, regex).toArray();
    matches.forEach((match: string) => result.add(match));
  }
  return result;
}

async function findStrings() {
  const result = new Set<string>();
  const promises: Promise<any>[] = [];
  const oktokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  if (
    github.context.payload.pull_request &&
    github.context.payload.repository
  ) {
    console.log("context payload has a pull request and a repository");
    console.log({
      owner: github.context.payload.repository.owner.login,
      repo: github.context.payload.repository.name,
      pull_number: github.context.payload.pull_request.number,
    });
    promises.push(
      oktokit.pulls
        .get({
          owner: github.context.payload.repository.owner.login,
          repo: github.context.payload.repository.name,
          pull_number: github.context.payload.pull_request.number,
        })
        .then((response: any) => result.add(response.data.head.label)),
    );
    promises.push(
      oktokit.pulls
        .listCommits({
          owner: github.context.payload.repository.owner.login,
          repo: github.context.payload.repository.name,
          pull_number: github.context.payload.pull_request.number,
        })
        .then((response: any) =>
          response.data.forEach((rr: any) => result.add(rr.commit.message)),
        ),
    );
  }

  await Promise.all(promises.map((it) => it.catch(console.error)));

  return result;
}

export default extractJiraKeysFromCommit;
