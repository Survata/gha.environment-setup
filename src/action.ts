// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { ActionArgs } from './actionArgs';
import { ssm } from './ssm';
import * as core from '@actions/core';
import { GetParametersCommandOutput, Parameter } from '@aws-sdk/client-ssm';
import * as command from '@actions/core/lib/command';
import { promises as fs } from 'fs';

export namespace Action {
    /**
     * Runs the action.
     *
     * @param args
     */
    export async function run(args: ActionArgs) {
        try {
            await exportVariables(args);
            await exportSecrets(args);
            await setNetAndNpm(args);
        } catch (e: any) {
            core.error(e.message);
        }
    }
}

/**
 * Export deployment variables.
 *
 * @param args
 */
async function exportVariables(args: ActionArgs) {
    const settingsString: string | undefined = await ssm.getSecret(`DEPLOYMENT_VARIABLES_${args.region.toUpperCase()}`);
    if (settingsString === undefined) {
        throw new Error('Failed to get settings from ParameterStore');
    }

    const allEnvironments: any = JSON.parse(settingsString);

    const environmentSettings: any = allEnvironments[args.environment];
    if (environmentSettings === undefined) {
        throw new Error('Failed to get environment settings from ParameterStore');
    }

    const variablesNotFound: string[] = [];
    args.variables.forEach((v) => {
        if (Object.prototype.hasOwnProperty.call(environmentSettings, v)) {
            core.exportVariable(v, environmentSettings[v]);
            core.info(`exported variable ${v}=${environmentSettings[v]}`);
        } else {
            variablesNotFound.push(v);
        }
    });
    if (variablesNotFound.length > 0) {
        throw new Error(`Failed to find variables in environment settings - ${variablesNotFound.join(',')}`);
    }
}

/**
 * Export deployment secrets.
 *
 * @param args
 */
async function exportSecrets(args: ActionArgs): Promise<void> {
    if (args.secrets.length > 0) {
        ssm.getSecrets(args.secrets).then((it: GetParametersCommandOutput) => {
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
                core.info(`exported secret ${p.Name}`);
            });
        });
    }
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
async function setNetAndNpm(args: ActionArgs): Promise<void> {
    const token: string | undefined = await ssm.getSecret(args.npmToken);
    await fs.writeFile('.netrc', `machine github.com login nobody password ${token}\n`);
    await fs.writeFile(
        `${process.env.HOME}/.npmrc`,
        `@Survata:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${token}\n`,
    );
}
