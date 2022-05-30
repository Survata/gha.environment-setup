import * as command from '@actions/core/lib/command';
import * as core from '@actions/core';
import { GetParametersCommand, SSMClient, Parameter } from '@aws-sdk/client-ssm';

try {
    const awsRegion = core.getInput('awsRegion');
    core.exportVariable('AWS_REGION', awsRegion);

    const secretNames = core.getMultilineInput('secretNames');

    getSecrets(awsRegion, secretNames).then((it: any) => {
        if (it.InvalidParameters.length > 0) {
            it.InvalidParameters.forEach((p: string) => {
                core.error(`Failed to fetch AWS secret: ${p}`);
            });
            core.setFailed('');
            return;
        }
        it.Parameters.forEach((p: Parameter) => {
            // core.info(`masking ${p.Name}`)
            command.issue('add-mask', p.Value);
            core.exportVariable(p.Name || '', p.Value);
        });
    });
} catch (error: any) {
    core.setFailed(error.message);
}

async function getSecrets(awsRegion: string, secretNames: string[]) {
    const client = new SSMClient({ region: awsRegion });
    const command = new GetParametersCommand({ Names: secretNames });
    return await client.send(command);
}
