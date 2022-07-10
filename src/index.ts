// Copyright (c) 2022 Upwave, All Rights Reserved

import { ActionArgs, NewActionArgs } from './actionArgs';
import { Action } from './action';

const args: ActionArgs = NewActionArgs();
Action.run(args).then();
