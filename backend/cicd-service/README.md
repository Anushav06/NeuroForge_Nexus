# NeuroForge Nexus – CI/CD Service

## M3 – CI/CD Pipeline Backend

The CI/CD Service is a Spring Boot microservice responsible for pipeline management, build tracking, test result tracking, deployment management, rollback, pipeline health, CI/CD metrics, coverage trends, and release management.

### Technology Stack

- Java 21
- Spring Boot 3.3.4
- Spring Web
- Spring Data MongoDB
- Spring Security
- JWT Authentication
- JJWT 0.12.6
- Jakarta Validation
- Lombok
- Spring Actuator
- Maven
- MongoDB

### Service Configuration

- **Service:** cicd-service
- **Port:** 8083
- **Database:** `nexus_cicd_db`
- **Base package:** `com.neuroforge.cicd`

---

## Implemented Features

### 1. Pipeline Management

Implemented complete CRUD and pipeline status management.

Supported operations:

- Create pipeline
- Get all pipelines for a project
- Get pipeline by ID
- Update pipeline
- Delete pipeline
- Enable/disable pipeline

Pipeline supports:

- Pipeline ID
- Project ID
- Pipeline name
- Repository URL
- Default branch
- Provider
- Stages
- Trigger type
- Cron expression
- Enabled status
- Health status
- Creation timestamp

Supported providers:

- GitHub Actions
- Jenkins

Supported trigger types:

- PUSH
- PR
- MANUAL
- SCHEDULE

Pipeline stages:

- Build
- Test
- Sonar
- Docker
- Deploy

---

### 2. Build Tracking

Implemented build creation and tracking for pipelines.

Supported operations:

- Trigger a build
- Get builds for a pipeline
- Filter builds by status
- Filter builds by branch
- Pagination
- Get build by ID
- Get stage logs
- Cancel build
- Retry failed/cancelled build
- Update build stage status

Build statuses:

- QUEUED
- RUNNING
- SUCCESS
- FAILED
- CANCELLED

Build triggers:

- PUSH
- PR
- MANUAL
- SCHEDULE

Each build contains:

- Build ID
- Pipeline ID
- Project ID
- Build number
- Branch
- Commit SHA
- Commit message
- Triggered user
- Trigger type
- Build status
- Start time
- Finish time
- Duration
- Stage information
- Test results
- Artifact URL
- Docker image tag

---

### 3. Build Stage Tracking

Implemented stage-level tracking for CI/CD pipelines.

Each stage supports:

- Stage name
- Stage status
- Start time
- Finish time
- Duration
- Logs

Stage state transitions are validated by the backend.

Supported stage states:

- QUEUED
- RUNNING
- SUCCESS
- FAILED
- CANCELLED

The overall build status is automatically updated based on the state of its stages.

---

### 4. Test Results

Implemented test-result tracking for builds.

Test results include:

- Passed tests
- Failed tests
- Skipped tests
- Total tests
- Code coverage percentage
- Test duration
- Test failures
- Sonar quality information

Sonar information includes:

- Quality gate
- Bugs
- Vulnerabilities
- Code smells
- Duplication percentage

Implemented APIs for:

- Saving test results
- Retrieving test results

---

### 5. Deployment Management

Implemented the deployment backend model and REST APIs.

Deployment supports:

- DEV
- STAGING
- PROD

Deployment statuses:

- IN_PROGRESS
- DEPLOYED
- FAILED
- ROLLED_BACK

Deployment information includes:

- Deployment ID
- Build ID
- Pipeline ID
- Project ID
- Environment
- Version
- Image tag
- Deployed by
- Start time
- Finish time
- Duration
- Desired replicas
- Ready replicas
- CPU usage
- Memory usage
- Previous deployment ID
- Rollback reason

Implemented operations:

- Deploy a build
- Get project deployments
- Get deployment by ID
- Get current deployment for an environment
- Update deployment health

---

### 6. Rollback Management

Implemented backend rollback functionality.

Rollback functionality:

- Validates the current deployment
- Checks for a previous successful deployment
- Marks the current deployment as `ROLLED_BACK`
- Creates a new deployment using the previous stable version
- Preserves the previous deployment relationship
- Stores the rollback reason

Also implemented:

- Get project rollback history

---

### 7. Pipeline Health

Implemented pipeline health monitoring.

Pipeline health is calculated from the latest build status.

Health states:

- HEALTHY
- DEGRADED
- FAILING

The service also contains scheduled health refresh functionality.

Health API provides:

- Pipeline ID
- Pipeline name
- Health status
- Latest build status
- Latest build number
- Last updated timestamp

---

### 8. CI/CD Statistics

Implemented CI/CD statistics API.

Statistics include:

- Builds per day
- Success rate
- Average deployment time
- Deployment trend

API:

```text
GET /projects/{projectId}/cicd/stats
