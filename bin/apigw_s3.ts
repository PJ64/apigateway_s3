#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ApigwS3Stack } from '../lib/apigw_s3-stack';

const app = new cdk.App();
new ApigwS3Stack(app, 'ApigwS3Stack', {

});