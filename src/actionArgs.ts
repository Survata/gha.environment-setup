// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import * as core from '@actions/core';

/**
 * Defines the action arguments.
 */
export interface ActionArgs {
    environment: string;
    npmToken: string;
    region: string;
    secrets: string[];
    variables: string[];
}

/**
 * Construct action arguments.
 *
 * @constructor
 */
export function NewActionArgs(): ActionArgs {
    return {
        environment: core.getInput('environmentName'),
        region: core.getInput('regionName'),
        npmToken: core.getInput('npmTokenName'),
        secrets: core.getMultilineInput('secretNames'),
        variables: core.getMultilineInput('variableNames'),
    };
}
