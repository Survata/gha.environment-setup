// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { ActionArgNames, ActionArgs } from './actionArgs';
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
            core.setFailed(e);
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
        if (Object.prototype.hasOwnProperty.call(environmentSettings, v.sourceName)) {
            core.exportVariable(v.exportName, environmentSettings[v.sourceName]);
            core.info(`exported variable ${v.exportName}=${environmentSettings[v.sourceName]}`);
        } else {
            variablesNotFound.push(v.sourceName);
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
        const secretNames: string[] = args.secrets.map((name: ActionArgNames) => name.sourceName);
        ssm.getSecrets(secretNames).then((it: GetParametersCommandOutput) => {
            if (it.InvalidParameters && it.InvalidParameters.length > 0) {
                it.InvalidParameters?.forEach((p: string) => {
                    core.error(`Failed to fetch AWS secret: ${p}`);
                });
                core.setFailed('');
                return;
            }
            it.Parameters?.forEach((p: Parameter) => {
                const argName: ActionArgNames | undefined = args.secrets.find(
                    (name: ActionArgNames) => name.sourceName === p.Name,
                );
                if (argName === undefined) {
                    core.setFailed('Failed to lookup action arg name');
                    return;
                }
                command.issue('add-mask', p.Value);
                core.exportVariable(argName.exportName, p.Value);
                core.info(`exported secret ${argName.exportName}`);
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
