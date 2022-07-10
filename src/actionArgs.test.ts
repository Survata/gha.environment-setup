// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { parseActionArgNames } from './actionArgs';

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
