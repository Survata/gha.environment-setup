// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

export namespace Util {
    /**
     * Tests if the provided string is "true".
     *
     * @param val
     */
    export function isTrue(val: string | boolean | undefined): boolean {
        if (val === undefined) {
            return false;
        }
        switch (val) {
            case 'true':
            case '1':
            case true:
                return true;
            default:
                return false;
        }
    }
}
