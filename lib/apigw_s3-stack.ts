import * as cdk from '@aws-cdk/core';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-iam';
import { Bucket } from '@aws-cdk/aws-s3';
import { EndpointType,AuthorizationType,AwsIntegration, RestApi, PassthroughBehavior} from '@aws-cdk/aws-apigateway';

export class ApigwS3Stack extends cdk.Stack {
  public readonly apiGatewayRole: Role;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3_bucket = new Bucket(this, "S3Bucket" ,{
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    //Create REST API
    const restApi = new RestApi(this, 'S3ObjectsApi', {
      restApiName: 'Api Gateway S3 Proxy Service',
      description: "S3 Actions Proxy API",
      endpointConfiguration: {
        types: [EndpointType.EDGE]
      },
      binaryMediaTypes: ['application/octet-stream', 'image/jpeg']
    });

    //Create {folder} API resource to list objects in a given bucket
    const bucketResource = restApi.root.addResource("{folder}");

    //Create {object} API resource to read/write an object in a given bucket
    const bucketItemResource = bucketResource.addResource("{object}");

    // Create IAM Role for API Gateway
    this.apiGatewayRole = new Role(this, 'api-gateway-role', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com')
    });

    //ListAllMyBuckets method
    this.addActionToPolicy("s3:ListAllMyBuckets");
    const listMyBucketsIntegration = new AwsIntegration({
      service: "s3",
      region: this.region,
      path: '/',
      integrationHttpMethod: "GET",
      options: {
        credentialsRole: this.apiGatewayRole,
        passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
        integrationResponses: [{
          statusCode: '200',
          responseParameters: { 'method.response.header.Content-Type': 'integration.response.header.Content-Type' }
        }]
      }
    });
    //ListAllMyBuckets method options
    const listMyBucketsMethodOptions = {
      authorizationType: AuthorizationType.NONE,
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true
          }
        }]
    };
    restApi.root.addMethod("GET", listMyBucketsIntegration, listMyBucketsMethodOptions);

    //ListBucket (Objects) method
    this.addActionToPolicy("s3:ListBucket");
    const listBucketIntegration = new AwsIntegration({
      service: "s3",
      region: this.region,
      path: '{bucket}',
      integrationHttpMethod: "GET",
      options: {
        credentialsRole: this.apiGatewayRole,
        passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
        requestParameters: { 'integration.request.path.bucket': 'method.request.path.folder' },
        integrationResponses: [{
          statusCode: '200',
          responseParameters: { 'method.response.header.Content-Type': 'integration.response.header.Content-Type' }
        }]
      }
    });

    //ListBucket (Objects) method options
    const listBucketMethodOptions = {
      authorizationType: AuthorizationType.NONE,
      requestParameters: {
        'method.request.path.folder': true
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true
          }
        }]
    };
    bucketResource.addMethod("GET", listBucketIntegration, listBucketMethodOptions);

    //GetObject method
    this.addActionToPolicy("s3:GetObject");
    const getObjectIntegration = new AwsIntegration({
      service: "s3",
      region: this.region,
      path: '{bucket}/{object}',
      integrationHttpMethod: "GET",
      options: {
        credentialsRole: this.apiGatewayRole,
        passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
        requestParameters: {
          'integration.request.path.bucket': 'method.request.path.folder',
          'integration.request.path.object': 'method.request.path.object',
          'integration.request.header.Accept': 'method.request.header.Accept'
        },
        integrationResponses: [{
          statusCode: '200',
          responseParameters: { 'method.response.header.Content-Type': 'integration.response.header.Content-Type' }
        }]
      }
    });

    //GetObject method options
    const getObjectMethodOptions = {
      authorizationType: AuthorizationType.NONE,
      requestParameters: {
        'method.request.path.folder': true,
        'method.request.path.object': true,
        'method.request.header.Accept': true
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true
          }
        }]
    };
    bucketItemResource.addMethod("GET", getObjectIntegration, getObjectMethodOptions);

    //PutObject method
    this.addActionToPolicy("s3:PutObject");
    const putObjectIntegration = new AwsIntegration({
      service: "s3",
      region: this.region,
      path: '{bucket}/{object}',
      integrationHttpMethod: "PUT",
      options: {
        credentialsRole: this.apiGatewayRole,
        passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
        requestParameters: {
          'integration.request.path.bucket': 'method.request.path.folder',
          'integration.request.path.object': 'method.request.path.object',
          'integration.request.header.Accept': 'method.request.header.Accept'
        },
        integrationResponses: [{
          statusCode: '200',
          responseParameters: { 'method.response.header.Content-Type': 'integration.response.header.Content-Type' }
        }]
      }
    });

    //PutObject method options
    const putObjectMethodOptions = {
      authorizationType: AuthorizationType.NONE,
      requestParameters: {
        'method.request.path.folder': true,
        'method.request.path.object': true,
        'method.request.header.Accept': true,
        'method.request.header.Content-Type': true
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true
          }
        }]
    };
    bucketItemResource.addMethod("PUT", putObjectIntegration, putObjectMethodOptions);
  }
  private addActionToPolicy(action: string) {
    this.apiGatewayRole.addToPolicy(new PolicyStatement({
      resources: [
        "*"
      ],
      actions: [`${action}`]
    }));
  }
}
