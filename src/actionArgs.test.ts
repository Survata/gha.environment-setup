// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import * as core from '@actions/core';
import { NewActionArgs, parseActionArgNames } from './actionArgs';

jest.mock('@actions/core');

describe('test parseActionArgNames()', () => {
    test('when success', () => {
        expect(parseActionArgNames('a')).toStrictEqual({ sourceName: 'a', exportName: 'a' });
        expect(parseActionArgNames('a:b')).toStrictEqual({ sourceName: 'a', exportName: 'b' });
    });
    test('when failure', () => {
        expect(() => parseActionArgNames('')).toThrow('Failed to parse ActionArgNames for source=[]');
        expect(() => parseActionArgNames(':')).toThrow('Failed to parse ActionArgNames for source=[:]');
        expect(() => parseActionArgNames(':a')).toThrow('Failed to parse ActionArgNames for source=[:a]');
        expect(() => parseActionArgNames('a:')).toThrow('Failed to parse ActionArgNames for source=[a:]');
    });
});

describe('test NewActionArgs()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('reads inputs and parses multiline secret and variable names', () => {
        const inputs: Record<string, string> = {
            environmentName: 'staging',
            regionName: 'us',
            npmTokenName: 'GITHUB_NPM_TOKEN',
        };
        const multilineInputs: Record<string, string[]> = {
            secretNames: ['DB_PASSWORD', 'API_KEY:API_KEY_OUT'],
            variableNames: ['FEATURE_FLAG'],
        };
        jest.mocked(core.getInput).mockImplementation((name: string) => inputs[name] ?? '');
        jest.mocked(core.getMultilineInput).mockImplementation((name: string) => multilineInputs[name] ?? []);

        const args = NewActionArgs();

        expect(args.environment).toBe('staging');
        expect(args.region).toBe('us');
        expect(args.npmToken).toBe('GITHUB_NPM_TOKEN');
        expect(args.secrets).toStrictEqual([
            { sourceName: 'DB_PASSWORD', exportName: 'DB_PASSWORD' },
            { sourceName: 'API_KEY', exportName: 'API_KEY_OUT' },
        ]);
        expect(args.variables).toStrictEqual([{ sourceName: 'FEATURE_FLAG', exportName: 'FEATURE_FLAG' }]);
    });
});
