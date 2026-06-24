// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import * as core from '@actions/core';
import { GetParametersCommandOutput } from '@aws-sdk/client-ssm';
import { Action } from './action';
import { ActionArgs } from './actionArgs';
import { ssm } from './ssm';

jest.mock('@actions/core');
jest.mock('@actions/core/lib/command');
jest.mock('./ssm');
// Preserve the real fs (fs.constants is read at import time by @actions/io); only
// stub writeFile so setNetAndNpm does not write real .netrc / ~/.npmrc files.
jest.mock('fs', () => {
    const actual = jest.requireActual('fs');
    return {
        ...actual,
        promises: { ...actual.promises, writeFile: jest.fn().mockResolvedValue(undefined) },
    };
});

const deploymentVariables = JSON.stringify({
    staging: { DB_HOST: 'db.staging.internal', FEATURE_FLAG: 'on' },
});

function buildArgs(overrides: Partial<ActionArgs> = {}): ActionArgs {
    return {
        environment: 'staging',
        region: 'us',
        npmToken: 'GITHUB_NPM_TOKEN',
        secrets: [],
        variables: [],
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ssm.getSecret).mockImplementation(async (name: string) =>
        name.startsWith('DEPLOYMENT_VARIABLES_') ? deploymentVariables : 'npm-token-value',
    );
});

describe('Action.run() variable export', () => {
    test('exports each requested variable from the parameter-store JSON', async () => {
        await Action.run(
            buildArgs({
                variables: [
                    { sourceName: 'DB_HOST', exportName: 'DB_HOST' },
                    { sourceName: 'FEATURE_FLAG', exportName: 'FLAG_OUT' },
                ],
            }),
        );

        expect(ssm.getSecret).toHaveBeenCalledWith('DEPLOYMENT_VARIABLES_US');
        expect(core.exportVariable).toHaveBeenCalledWith('DB_HOST', 'db.staging.internal');
        expect(core.exportVariable).toHaveBeenCalledWith('FLAG_OUT', 'on');
        expect(core.setFailed).not.toHaveBeenCalled();
    });

    test('fails the action when a requested variable is missing', async () => {
        await Action.run(buildArgs({ variables: [{ sourceName: 'NOPE', exportName: 'NOPE' }] }));

        expect(core.exportVariable).not.toHaveBeenCalled();
        expect(core.setFailed).toHaveBeenCalled();
    });

    test('skips variable export when no region is provided', async () => {
        await Action.run(buildArgs({ region: '', variables: [{ sourceName: 'DB_HOST', exportName: 'DB_HOST' }] }));

        expect(ssm.getSecret).not.toHaveBeenCalledWith('DEPLOYMENT_VARIABLES_US');
        expect(core.exportVariable).not.toHaveBeenCalled();
    });
});

describe('Action.run() secret export', () => {
    test('masks and exports each secret returned by parameter store', async () => {
        jest.mocked(ssm.getSecrets).mockResolvedValue({
            Parameters: [{ Name: 'DB_PASSWORD', Value: 's3cr3t' }],
            InvalidParameters: [],
            $metadata: {},
        } as GetParametersCommandOutput);

        await Action.run(
            buildArgs({ region: '', secrets: [{ sourceName: 'DB_PASSWORD', exportName: 'DB_PASSWORD_OUT' }] }),
        );
        // exportSecrets settles its SSM promise on the microtask queue; let it drain before asserting.
        await new Promise((resolve) => setImmediate(resolve));

        expect(core.exportVariable).toHaveBeenCalledWith('DB_PASSWORD_OUT', 's3cr3t');
    });
});
