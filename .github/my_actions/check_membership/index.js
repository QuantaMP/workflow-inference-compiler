// See https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action
// NOTE: Every time you modify this file, you need to run
// `ncc build index.js && git add -f dist/index.js index.js package.json package-lock.json`
// You do NOT need to git add node_modules/*

const core = require('@actions/core');
const github = require('@actions/github');
import fetch from "node-fetch";

try {
  const account_name = core.getInput('account_name');
  const access_token = core.getInput('access_token');

  if (!access_token) {
    console.log("Error! access_token is not defined! (or expired)");
  }

  let verified = false;
  if (!verified) {
    // Step 1: Check whether the account to check is the owner of the repository
    verified = account_name === github.context.repo.owner;
  }

  if (!verified) {
    // Step 2: Check whether the account is an external collaborator of the repository
    
    // GitHub API doc: https://docs.github.com/en/rest/collaborators/collaborators?apiVersion=2022-11-28#check-if-a-user-is-a-repository-collaborator
    // Note: the user is only checked against the collaborator list of the current repository.
    // So for cross repo CIs, the sender should be added as a collaborator to all repos.
    const url = `https://api.github.com/repos/${github.context.repo.owner}/${github.context.repo.repo}/collaborators/${account_name}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    verified = response.status === 204;
    if (!verified) {
        console.log(`Collaborator check failed with status: ${response.status}`)
        console.log(`url: ${url}`);
        console.log(`response.json(): ${JSON.stringify(await response.json(), undefined, 2)}`);
    }
  }

  if (!verified && github.context.repo.owner === 'PolusAI') {
    // Step 3: Check whether the account is a member of the PolusAI.
    // This step will only be run when the workflow is currenlty running on PolusAI. Otherwise,
    // the access_token would be invalid anyway.
    
    // GitHub API doc: https://docs.github.com/en/rest/orgs/members?apiVersion=2022-11-28#check-organization-membership-for-a-user
    const url = `https://api.github.com/orgs/PolusAI/members/${account_name}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    verified = response.status === 204;
    if (!verified) {
        console.log(`Membership check failed with status: ${response.status}`)
        console.log(`url: ${url}`);
        console.log(`response.json(): ${JSON.stringify(await response.json(), undefined, 2)}`);
    }
  }

  // GitHub is not very clear about type declaration in JS actions and payloads in webhooks.
  // See the discussion: https://github.com/actions/runner/issues/1483#issuecomment-969295757
  // To avoid ambiguity, use string for output and string comparison in workflow steps.
  core.setOutput('verified', verified.toString());

  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
