// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import {
    GetParameterCommand,
    GetParameterCommandOutput,
    GetParametersCommand,
    GetParametersCommandOutput,
    SSMClient,
} from '@aws-sdk/client-ssm';

export namespace ssm {
    /**
     * Get a secret from AWS Parameter Store.
     *
     * @param secretName
     */
    export async function getSecret(secretName: string): Promise<string | undefined> {
        try {
            const client: SSMClient = new SSMClient({});
            const command: GetParameterCommand = new GetParameterCommand({ Name: secretName });
            const out: GetParameterCommandOutput = await client.send(command);
            return out.Parameter?.Value;
        } catch (e) {
            return undefined;
        }
    }

    /**
     * Get a list of secrets from AWS Parameter Store.
     *
     * @param secretNames
     */
    export async function getSecrets(secretNames: string[]): Promise<GetParametersCommandOutput> {
        const client: SSMClient = new SSMClient({});
        const command: GetParametersCommand = new GetParametersCommand({ Names: secretNames });
        return await client.send(command);
    }
}
