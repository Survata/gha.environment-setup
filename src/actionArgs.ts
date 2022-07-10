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
    secrets: ActionArgNames[];
    variables: ActionArgNames[];
}

/**
 * Defines the action agrument names.
 */
export interface ActionArgNames {
    sourceName: string;
    exportName: string;
}

/**
 * Construct action arguments.
 *
 * @constructor
 */
export function NewActionArgs(): ActionArgs {
    const args: ActionArgs = {
        environment: core.getInput('environmentName'),
        region: core.getInput('regionName'),
        npmToken: core.getInput('npmTokenName'),
        secrets: [],
        variables: [],
    };

    core.getMultilineInput('secretNames').forEach((name: string) => {
        args.secrets.push(parseActionArgNames(name));
    });

    core.getMultilineInput('variableNames').forEach((name: string) => {
        args.variables.push(parseActionArgNames(name));
    });

    return args;
}

/**
 * Parse a string into action arg names.
 *
 * @param source
 */
export function parseActionArgNames(source: string): ActionArgNames {
    const parts: string[] = source.split(':');
    if (parts.length === 1 && source.length > 0) {
        return { sourceName: source, exportName: source };
    }
    if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
        return { sourceName: parts[0], exportName: parts[1] };
    }
    throw new Error(`Failed to parse ActionArgNames for source=[${source}]`);
}
