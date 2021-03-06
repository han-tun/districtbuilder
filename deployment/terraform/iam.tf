#
# ECS IAM resources
#
data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    actions = [
      "sts:AssumeRole",
    ]
  }
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name               = "ecs${var.environment}TaskExecutionRole"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role" "ecs_task_role" {
  name               = "ecs${var.environment}TaskRole"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = var.aws_ecs_task_execution_role_policy_arn
}

data "aws_iam_policy_document" "scoped_email_sending" {
  statement {
    effect = "Allow"

    actions = ["ses:SendRawEmail"]

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"

      values = ["no-reply@${var.r53_public_hosted_zone}"]
    }
  }
}

resource "aws_iam_role_policy" "scoped_email_sending" {
  name   = "ses${var.environment}ScopedEmailSendingPolicy"
  role   = aws_iam_role.ecs_task_role.name
  policy = data.aws_iam_policy_document.scoped_email_sending.json
}

data "aws_elb_service_account" "main" {}

data "aws_iam_policy_document" "alb_access_logging" {
  statement {
    effect = "Allow"

    actions = ["s3:PutObject"]

    principals {
      type        = "AWS"
      identifiers = [data.aws_elb_service_account.main.arn]
    }

    resources = [
      "${aws_s3_bucket.logs.arn}/ALB/*",
    ]
  }
}

resource "aws_s3_bucket_policy" "alb_access_logging" {
  bucket = aws_s3_bucket.logs.id
  policy = data.aws_iam_policy_document.alb_access_logging.json
}
