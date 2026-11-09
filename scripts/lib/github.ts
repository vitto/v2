/*
  What the scripts of v2 read from GitHub, through `gh` as the person running them is signed in.
  Only reads: nothing here changes GitHub (scripts/merge.ts is the one place that merges).

  Where each answer comes from:

  - the repository, its default branch (`defaultBranchRef`), whether it takes merge commits
    (`mergeCommitAllowed`) and whether a branch has a merge queue (`mergeQueue(branch:)`): the
    GraphQL API;
  - an epic: its sub-issues, their linked branches, their "blocked by" dependencies, the pull
    requests in their timelines (cross references, the first 100 of each part), the pull requests
    into the branch of the epic (first 100) and from it into the default branch (first 10):
    the GraphQL API; the distance of the branch of the epic from the default branch: the REST
    compare API; the files of the open pull requests (first 100 each): the GraphQL API;
  - the open epics: the advanced issue search (`ISSUE_ADVANCED`; the plain one ignores the
    qualifier) for `has:sub-issue`, newest first, with `subIssuesSummary`;
  - the open pull requests of the repository: the GraphQL API, oldest first (first 100);
  - the runs of a workflow that are not finished: `gh run list` (the last 20 runs);
  - checks: the status rollup of the last commit of a pull request (none reported is not green).
*/
import type { BlockingWorkflow } from './config.ts';
import type { Checks, Epic, Part, PullRequest } from './epic.ts';
import { gh, graphql, type Repo } from './run.ts';

export const PR_FIELDS = `fragment pr on PullRequest {
  number title url state isDraft baseRefName headRefName createdAt mergedAt body mergeable isInMergeQueue
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}`;

export interface RawPullRequest extends Omit<PullRequest, 'checks' | 'files'> {
  commits: { nodes: { commit: { statusCheckRollup: { state: Checks } | null } }[] };
}

export const toPullRequest = (raw: RawPullRequest): PullRequest => ({
  number: raw.number,
  title: raw.title,
  url: raw.url,
  state: raw.state,
  isDraft: raw.isDraft,
  baseRefName: raw.baseRefName,
  headRefName: raw.headRefName,
  createdAt: raw.createdAt,
  mergedAt: raw.mergedAt,
  body: raw.body ?? '',
  mergeable: raw.mergeable,
  isInMergeQueue: raw.isInMergeQueue,
  checks: raw.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
  files: [],
});

const isPullRequest = (node: unknown): node is RawPullRequest =>
  typeof node === 'object' && node !== null && 'headRefName' in node;

type Branches = { nodes: { ref: { name: string } | null }[] };

const names = (branches: Branches): string[] =>
  branches.nodes.map((node) => node.ref?.name).filter((name): name is string => !!name);

/** The commits a branch has past the default branch, and those it misses; null when it is not on GitHub. */
export const distanceOf = (
  repo: Repo,
  base: string,
  head: string,
): { ahead: number; behind: number } | null => {
  try {
    return JSON.parse(
      gh([
        'api',
        `repos/${repo.owner}/${repo.name}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
        '--jq',
        '{ahead: .ahead_by, behind: .behind_by}',
      ]),
    ) as { ahead: number; behind: number };
  } catch {
    return null;
  }
};

/** Fills in the files of the open pull requests among `prs` (one query for all of them). */
export const readFiles = (repo: Repo, prs: PullRequest[]): void => {
  const open = new Map<number, PullRequest[]>();
  for (const pr of prs)
    if (pr.state === 'OPEN') open.set(pr.number, [...(open.get(pr.number) ?? []), pr]);
  if (!open.size) return;
  const aliases = [...open.keys()].map(
    (n) => `p${n}: pullRequest(number: ${n}) { files(first: 100) { nodes { path } } }`,
  );
  const files = graphql<{
    repository: Record<string, { files: { nodes: { path: string }[] } } | null>;
  }>(
    `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${aliases.join('\n')} } }`,
    { owner: repo.owner, name: repo.name },
  );
  for (const [n, copies] of open) {
    const paths = files.repository[`p${n}`]?.files.nodes.map((node) => node.path) ?? [];
    for (const pr of copies) pr.files = paths;
  }
};

/** Reads an epic, and whether its default branch has a merge queue. */
export const readEpic = (
  repo: Repo,
  number: number,
  branchOption?: string,
): { epic: Epic; mergeQueue: boolean } => {
  const vars = { owner: repo.owner, name: repo.name };
  type Issue = {
    number: number;
    title: string;
    url: string;
    state: 'OPEN' | 'CLOSED';
    linkedBranches: Branches;
  };
  const first = graphql<{
    repository: {
      defaultBranchRef: { name: string };
      issue:
        | (Issue & {
            subIssues: {
              nodes: (Issue & {
                blockedBy: { nodes: { number: number; state: 'OPEN' | 'CLOSED' }[] };
                timelineItems: { nodes: { source?: unknown }[] };
              })[];
            };
          })
        | null;
    };
  }>(
    `
      ${PR_FIELDS}
      query ($owner: String!, $name: String!, $n: Int!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { name }
          issue(number: $n) {
            number title url state
            linkedBranches(first: 10) { nodes { ref { name } } }
            subIssues(first: 50) {
              nodes {
                number title url state
                linkedBranches(first: 10) { nodes { ref { name } } }
                blockedBy(first: 20) { nodes { number state } }
                timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
                  nodes { ... on CrossReferencedEvent { source { ...pr } } }
                }
              }
            }
          }
        }
      }
    `,
    { ...vars, n: number },
  );
  const issue = first.repository.issue;
  if (!issue) throw new Error(`#${number} is not an issue of ${repo.owner}/${repo.name}`);
  const defaultBranch = first.repository.defaultBranchRef.name;
  const linkedBranches = names(issue.linkedBranches);
  const branch = branchOption ?? (linkedBranches.length === 1 ? linkedBranches[0] : null);
  const parts: Part[] = issue.subIssues.nodes.map((sub) => ({
    number: sub.number,
    title: sub.title,
    url: sub.url,
    state: sub.state,
    branches: names(sub.linkedBranches),
    blockedBy: sub.blockedBy.nodes,
    mentions: sub.timelineItems.nodes
      .map((node) => node.source)
      .filter(isPullRequest)
      .map(toPullRequest),
  }));

  let intoBranch: PullRequest[] = [];
  let landings: PullRequest[] = [];
  let distance: Epic['distance'] = null;
  let mergeQueue = false;
  const second = graphql<{
    repository: {
      queue: { url: string } | null;
      into?: { nodes: RawPullRequest[] };
      landings?: { nodes: RawPullRequest[] };
    };
  }>(
    branch
      ? `
        ${PR_FIELDS}
        query ($owner: String!, $name: String!, $branch: String!, $base: String!) {
          repository(owner: $owner, name: $name) {
            queue: mergeQueue(branch: $base) { url }
            into: pullRequests(baseRefName: $branch, first: 100, states: [OPEN, MERGED]) {
              nodes { ...pr }
            }
            landings: pullRequests(headRefName: $branch, baseRefName: $base, first: 10, states: [OPEN, MERGED]) {
              nodes { ...pr }
            }
          }
        }
      `
      : `
        query ($owner: String!, $name: String!, $base: String!) {
          repository(owner: $owner, name: $name) { queue: mergeQueue(branch: $base) { url } }
        }
      `,
    branch ? { ...vars, branch, base: defaultBranch } : { ...vars, base: defaultBranch },
  );
  mergeQueue = !!second.repository.queue;
  if (branch) {
    intoBranch = (second.repository.into?.nodes ?? []).map(toPullRequest);
    landings = (second.repository.landings?.nodes ?? []).map(toPullRequest);
    distance = distanceOf(repo, defaultBranch, branch);
  }

  // The files of the open pull requests, for the shared-files warning.
  readFiles(repo, [...parts.flatMap((part) => part.mentions), ...intoBranch, ...landings]);

  return {
    epic: {
      number: issue.number,
      title: issue.title,
      url: issue.url,
      state: issue.state,
      defaultBranch,
      branch,
      linkedBranches,
      parts,
      intoBranch,
      landings,
      distance,
    },
    mergeQueue,
  };
};

export interface EpicSummary {
  number: number;
  title: string;
  url: string;
  parts: { total: number; completed: number };
  branches: string[];
}

export interface Overview {
  defaultBranch: string;
  mergeQueue: boolean;
  epics: EpicSummary[];
  pulls: PullRequest[];
}

/** The open epics and the open pull requests of a repository. */
export const readOverview = (repo: Repo): Overview => {
  const data = graphql<{
    repository: {
      defaultBranchRef: { name: string };
      pullRequests: { nodes: RawPullRequest[] };
    };
    search: {
      nodes: ({
        number: number;
        title: string;
        url: string;
        subIssuesSummary: { total: number; completed: number };
        linkedBranches: Branches;
      } | Record<string, never>)[];
    };
  }>(
    `
      ${PR_FIELDS}
      query ($owner: String!, $name: String!, $q: String!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { name }
          pullRequests(states: [OPEN], first: 100, orderBy: { field: CREATED_AT, direction: ASC }) {
            nodes { ...pr }
          }
        }
        search(query: $q, type: ISSUE_ADVANCED, first: 50) {
          nodes {
            ... on Issue {
              number title url
              subIssuesSummary { total completed }
              linkedBranches(first: 10) { nodes { ref { name } } }
            }
          }
        }
      }
    `,
    {
      owner: repo.owner,
      name: repo.name,
      q: `repo:${repo.owner}/${repo.name} is:issue is:open has:sub-issue`,
    },
  );
  const defaultBranch = data.repository.defaultBranchRef.name;
  const queue = graphql<{ repository: { mergeQueue: { url: string } | null } }>(
    `query ($owner: String!, $name: String!, $base: String!) {
      repository(owner: $owner, name: $name) { mergeQueue(branch: $base) { url } }
    }`,
    { owner: repo.owner, name: repo.name, base: defaultBranch },
  );
  const pulls = data.repository.pullRequests.nodes.map(toPullRequest);
  readFiles(repo, pulls);
  return {
    defaultBranch,
    mergeQueue: !!queue.repository.mergeQueue,
    epics: data.search.nodes
      .filter((node): node is Exclude<typeof node, Record<string, never>> => 'number' in node)
      .filter((node) => node.subIssuesSummary.total > 0)
      .sort((a, b) => b.number - a.number)
      .map((node) => ({
        number: node.number,
        title: node.title,
        url: node.url,
        parts: node.subIssuesSummary,
        branches: names(node.linkedBranches),
      })),
    pulls,
  };
};

export interface MergeFacts {
  pr: PullRequest & {
    headRefOid: string;
    isCrossRepository: boolean;
    reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
    mergeStateStatus: string;
  };
  defaultBranch: string;
  mergeCommitAllowed: boolean;
  /** Whether the base branch of the pull request has a merge queue. */
  baseQueue: boolean;
  /** How far the base is behind the default branch, when the base is not the default branch. */
  baseDistance: { ahead: number; behind: number } | null;
}

/** What a merge needs to know about a pull request and its repository. */
export const readMergeFacts = (repo: Repo, number: number): MergeFacts => {
  const data = graphql<{
    repository: {
      defaultBranchRef: { name: string };
      mergeCommitAllowed: boolean;
      pullRequest:
        | (RawPullRequest & {
            headRefOid: string;
            isCrossRepository: boolean;
            reviewDecision: MergeFacts['pr']['reviewDecision'];
            mergeStateStatus: string;
          })
        | null;
    };
  }>(
    `
      ${PR_FIELDS}
      query ($owner: String!, $name: String!, $n: Int!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { name }
          mergeCommitAllowed
          pullRequest(number: $n) {
            ...pr
            headRefOid isCrossRepository reviewDecision mergeStateStatus
          }
        }
      }
    `,
    { owner: repo.owner, name: repo.name, n: number },
  );
  const raw = data.repository.pullRequest;
  if (!raw) throw new Error(`#${number} is not a pull request of ${repo.owner}/${repo.name}`);
  const defaultBranch = data.repository.defaultBranchRef.name;
  const queue = graphql<{ repository: { mergeQueue: { url: string } | null } }>(
    `query ($owner: String!, $name: String!, $base: String!) {
      repository(owner: $owner, name: $name) { mergeQueue(branch: $base) { url } }
    }`,
    { owner: repo.owner, name: repo.name, base: raw.baseRefName },
  );
  return {
    pr: {
      ...toPullRequest(raw),
      headRefOid: raw.headRefOid,
      isCrossRepository: raw.isCrossRepository,
      reviewDecision: raw.reviewDecision,
      mergeStateStatus: raw.mergeStateStatus,
    },
    defaultBranch,
    mergeCommitAllowed: data.repository.mergeCommitAllowed,
    baseQueue: !!queue.repository.mergeQueue,
    baseDistance:
      raw.baseRefName === defaultBranch ? null : distanceOf(repo, defaultBranch, raw.baseRefName),
  };
};

export interface Run {
  workflow: string;
  event: string;
  status: string;
  url: string;
}

/** The runs of the blocking workflows that are not finished (queued, waiting for an approval, running). */
export const unfinishedRuns = (repo: Repo, blocking: BlockingWorkflow[]): Run[] =>
  blocking.flatMap((workflow) => {
    const args = [
      'run',
      'list',
      '-R',
      `${repo.owner}/${repo.name}`,
      '--workflow',
      workflow.workflow,
      '--limit',
      '20',
      '--json',
      'status,event,url,workflowName',
    ];
    if (workflow.event) args.push('--event', workflow.event);
    const runs = JSON.parse(gh(args)) as {
      status: string;
      event: string;
      url: string;
      workflowName: string;
    }[];
    return runs
      .filter((one) => one.status !== 'completed')
      .map((one) => ({ workflow: workflow.workflow, event: one.event, status: one.status, url: one.url }));
  });
