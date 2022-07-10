// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { Util } from './util';

describe('test isTrue()', () => {
    test('when false', () => {
        expect(Util.isTrue(undefined)).toBe(false);
        expect(Util.isTrue('false')).toBe(false);
        expect(Util.isTrue('0')).toBe(false);
    });
    test('when true', () => {
        expect(Util.isTrue('true')).toBe(true);
        expect(Util.isTrue('1')).toBe(true);
        expect(Util.isTrue(true)).toBe(true);
    });
});
