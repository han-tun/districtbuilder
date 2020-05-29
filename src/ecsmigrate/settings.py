ENVIRONMENTS = {
    'default': {
        'TASK_DEFINITION_NAME': 'StagingApp',
        'CLUSTER_NAME': 'ecsStagingCluster',
        'LAUNCH_TYPE': 'FARGATE',
        'SECURITY_GROUP_TAGS': {
            'Name': 'sgStagingAppEcsService',
            'Environment': 'Staging',
            'Project': 'DistrictBuilder'
        },
        'SUBNET_TAGS': {
            'Name': 'PrivateSubnet',
            'Environment': 'Staging',
            'Project': 'DistrictBuilder'
        },
        'AWS_REGION': 'us-east-1',
    },
}
