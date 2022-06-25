// Copyright (c) 2022 Upwave, All Rights Reserved

import * as command from '@actions/core/lib/command';
import * as core from '@actions/core';
import { GetParametersCommand, SSMClient, Parameter, GetParametersCommandOutput } from '@aws-sdk/client-ssm';
import * as fs from 'node:fs/promises';

try {
    setNetAndNpm();

    const awsRegion: string = core.getInput('awsRegion');
    core.exportVariable('AWS_REGION', awsRegion);

    const secretNames: string[] = core.getMultilineInput('secretNames');
    getSecrets(awsRegion, secretNames).then((it: GetParametersCommandOutput) => {
        if (it.InvalidParameters && it.InvalidParameters.length > 0) {
            it.InvalidParameters?.forEach((p: string) => {
                core.error(`Failed to fetch AWS secret: ${p}`);
            });
            core.setFailed('');
            return;
        }
        it.Parameters?.forEach((p: Parameter) => {
            command.issue('add-mask', p.Value);
            core.exportVariable(p.Name || '', p.Value);
        });
    });
} catch (error: any) {
    core.setFailed(error.message);
}

/**
 *
 * @param awsRegion
 * @param secretNames
 */
async function getSecrets(awsRegion: string, secretNames: string[]): Promise<GetParametersCommandOutput> {
    const client: SSMClient = new SSMClient({ region: awsRegion });
    const command: GetParametersCommand = new GetParametersCommand({ Names: secretNames });
    return await client.send(command);
}

/**
 * Sets up the .netrc and .npmrc files.
 *
 * Writes .netrc as:
 * machine github.com login nobody password {npmToken}
 *
 * Writes .npmrc as:
 * @Survata:registry=https://npm.pkg.github.com
 * //npm.pkg.github.com/:_authToken={npmToken}
 *
 */
function setNetAndNpm() {
    const npmToken: string = core.getInput('npmToken');
    writeFile('.netrc', `machine github.com login nobody password ${npmToken}`).then();
    writeFile(
        '.npmrc',
        `@Survata:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${npmToken}`,
    ).then();
}

async function writeFile(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content);
}
