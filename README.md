# gha.environment-setup

A GitHub Action that sets up the runner environment for Upwave's CI/CD workflows. It reads
configuration from AWS SSM Parameter Store and:

- exports deployment **variables** for the selected environment as workflow environment variables;
- fetches **secrets** from Parameter Store, masks them, and exports them as environment variables;
- writes `.netrc` and `~/.npmrc` using an npm token from Parameter Store so subsequent steps can
  install private `@Survata` packages from GitHub Packages.

## Usage

```yaml
# AWS credentials must already be configured (the action reads from SSM Parameter Store).
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: us-east-1

- name: Set up environment
  uses: Survata/gha.environment-setup@v1
  with:
    environmentName: staging
    regionName: us
    variableNames: |
      API_BASE_URL
      FEATURE_FLAGS:FLAGS
    secretNames: |
      DB_PASSWORD
      THIRD_PARTY_API_KEY:API_KEY
    npmTokenName: GITHUB_NPM_TOKEN
```

### Inputs

| Input             | Required | Default            | Description                                                                                 |
|-------------------|----------|--------------------|---------------------------------------------------------------------------------------------|
| `environmentName` | no       | —                  | Environment key into the deployment-variables document (e.g. `staging`, `production`).      |
| `regionName`      | no       | —                  | Region used to look up `DEPLOYMENT_VARIABLES_<REGION>` in Parameter Store. If empty, variable export is skipped. |
| `variableNames`   | no       | —                  | Newline-separated list of deployment variables to export.                                   |
| `secretNames`     | no       | —                  | Newline-separated list of Parameter Store secrets to fetch, mask, and export.               |
| `npmTokenName`    | yes      | `GITHUB_NPM_TOKEN` | Parameter Store name of the npm token written to `.netrc` / `~/.npmrc`.                      |

Each entry in `variableNames` and `secretNames` is either `NAME` (exported under the same name) or
`SOURCE:EXPORT` (read from `SOURCE`, exported as `EXPORT`).

## Development

Requires Node 20 (see `.nvmrc`).

```bash
nvm use
yarn install
yarn lint
yarn test       # jest
yarn package    # rebuilds bin/index.js
```

The action runs `bin/index.js`, a committed bundle produced by `@vercel/ncc`. **You must run
`yarn package` after any source or dependency change** and commit the regenerated `bin/index.js`
alongside the change. The [`check commit`](.github/workflows/checkCommit.yaml) workflow lints, tests,
and rebuilds the bundle on every push to a non-`master` branch.

## Publishing a new version (rebuild the binary and re-tag)

All consumers reference `Survata/gha.environment-setup@v1`. The `v1` tag is a **floating tag** —
moving it rolls every consumer to the new version on their next workflow run. No consumer-side
changes are required.

The shipped artifact is the committed `bin/index.js` bundle, **not** `package.json` / `yarn.lock`.
A source or dependency change is not live until the bundle is rebuilt and the `v1` tag is moved.

### Procedure

1. Make your source and/or dependency changes on a branch.

2. Reinstall, verify, and regenerate the bundle:

   ```bash
   yarn install
   yarn lint
   yarn test
   yarn package
   ```

3. Commit the regenerated bundle alongside the change, and merge to `master`:

   ```bash
   git add src/ bin/index.js package.json yarn.lock action.yaml
   git commit -m "Describe the change"
   # open a PR, get it reviewed, and merge to master
   ```

4. **Move the `v1` tag** to the merged commit on `master`. This is the moment of rollout:

   ```bash
   git checkout master && git pull
   git tag -f v1
   git push origin v1 --force
   ```

   Consumers pick up the new version on their next workflow run.

5. **Optional — cut an immutable version tag** for traceability:

   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

## Dependency updates (Dependabot)

> ⚠️ **Merging a Dependabot PR is not a deploy.** The artifact that runs in consumer workflows is the
> committed `bin/index.js` bundle, which Dependabot does **not** regenerate. If you merge a dependency
> bump and stop there, every consumer keeps running the old code baked into `bin/index.js`.

To actually ship a dependency update:

1. Check out the Dependabot branch so `package.json` / `yarn.lock` are updated.
2. `yarn install && yarn lint && yarn test && yarn package`.
3. Commit the regenerated `bin/index.js` together with the lockfile change.
4. Merge, then follow [Publishing a new version](#publishing-a-new-version-rebuild-the-binary-and-re-tag)
   to **move the `v1` tag**. The rollout is not live until `v1` moves.

A quick way to confirm a bump reached the bundle: after `yarn package`, grep `bin/index.js` for the
patched code or version string before moving `v1`.
