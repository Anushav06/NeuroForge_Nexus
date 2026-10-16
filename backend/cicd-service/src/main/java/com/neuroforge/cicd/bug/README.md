
# NeuroForge Nexus — Bug Management API

## 1. Overview

The Bug Management module is part of the NeuroForge Nexus backend. It provides REST APIs to create, retrieve, assign, update, and delete bugs associated with projects.

The module uses Spring Boot, Spring Security, JWT authentication, and MongoDB. It also integrates with the User Service to retrieve the name of the user reporting a bug.

## 2. Technologies Used

* **Java 21** — Programming language and Java runtime compatibility.
* **Spring Boot 3.3.4** — Backend application framework.
* **Spring Web** — REST API development.
* **Spring Security** — Authentication and authorization.
* **JWT** — Token-based authentication.
* **Spring Data MongoDB** — Database integration.
* **MongoDB** — Bug data storage.
* **Maven** — Dependency management and application execution.

## 3. Module Structure

The Bug Management module contains the following components:

```text
backend/cicd-service/
└── src/main/java/com/neuroforge/cicd/
    ├── RestTemplateConfig.java
    └── bug/
        ├── Bug.java
        ├── controller/
        │   └── BugController.java
        ├── repository/
        │   └── BugRepository.java
        ├── service/
        │   └── BugService.java
        └── dto/
            ├── CreateBugRequest.java
            ├── AssignBugRequest.java
            └── UpdateBugStatusRequest.java
```

*Note: This structure reflects the files we worked with; verify it against your actual repository before submitting.*

## 4. Features Implemented

### 4.1 Create Bug

Creates a new bug associated with a project.

**Endpoint:**

```http
POST /projects/{projectId}/bugs
```

Features:

* Accepts bug details through a JSON request.
* Associates the bug with a project.
* Records the authenticated user's ID as the reporter.
* Retrieves the reporter's name through the User Service.
* Assigns the initial status as `NEW`.
* Saves the bug in MongoDB.
* Optionally assigns the bug during creation.

### 4.2 Retrieve Project Bugs

Retrieves all bugs associated with a particular project.

**Endpoint:**

```http
GET /projects/{projectId}/bugs
```

Returns a list of bugs associated with the specified project.

### 4.3 Retrieve Bug by ID

Retrieves an individual bug using its unique identifier.

**Endpoint:**

```http
GET /bugs/{bugId}
```

Returns the bug's details, including its status, severity, priority, reporter, assignee, and timestamps.

### 4.4 Update Bug Status

Updates the status of an existing bug.

**Endpoint:**

```http
PATCH /bugs/{bugId}/status
```

Example request:

```json
{
  "status": "IN_PROGRESS"
}
```

The status-update logic enforces the business rule that a bug must be assigned before moving to `IN_PROGRESS`.

Supported statuses:

* `NEW`
* `CONFIRMED`
* `IN_PROGRESS`
* `FIXED`
* `RETEST`
* `CLOSED`
* `REOPENED`

### 4.5 Assign Bug

Assigns a bug to a user.

**Endpoint:**

```http
PATCH /bugs/{bugId}/assign
```

Example request:

```json
{
  "assignedTo": "USER_ID"
}
```

The endpoint updates the bug's assignee.

### 4.6 Delete Bug

Deletes an existing bug.

**Endpoint:**

```http
DELETE /bugs/{bugId}
```

The endpoint is restricted to users with the following roles:

* `ADMIN`
* `PROJECT_LEAD`
* `PROJECT_MANAGER`

The delete operation has been implemented, but successful deletion with an authorized account has not yet been verified.

## 5. Bug Data Model

The `Bug` model contains the following fields:

| Field            | Description                             |
| ---------------- | --------------------------------------- |
| `id`             | Unique bug identifier                   |
| `projectId`      | ID of the associated project            |
| `title`          | Bug title                               |
| `description`    | Description of the bug                  |
| `module`         | Application module where the bug occurs |
| `environment`    | Environment in which the bug occurs     |
| `severity`       | Impact level of the bug                 |
| `priority`       | Priority for addressing the bug         |
| `status`         | Current status of the bug               |
| `reportedBy`     | ID of the user reporting the bug        |
| `reportedByName` | Name of the reporting user              |
| `assignedTo`     | ID of the assigned user                 |
| `createdAt`      | Bug creation timestamp                  |
| `updatedAt`      | Last-update timestamp                   |
| `attachments`    | List of attachment metadata             |

### Supported Environments

* `DEVELOPMENT`
* `STAGING`
* `PRODUCTION`

### Supported Severity Levels

* `CRITICAL`
* `HIGH`
* `MEDIUM`
* `LOW`

### Supported Priority Levels

* `URGENT`
* `HIGH`
* `MEDIUM`
* `LOW`

## 6. Authentication and Authorization

The CICD Service uses JWT-based authentication.

Protected API requests require an access token in the HTTP Authorization header.

Example:

```http
Authorization: Bearer <JWT_TOKEN>
```

The JWT filter extracts the user ID and role from the token and establishes the Spring Security authentication context.

The `BugController` uses `@PreAuthorize` annotations to restrict access to individual operations.

**Important:** The current role configuration allows `EMPLOYEE` users to assign bugs and update bug statuses following our testing changes. Confirm these permissions against the project's requirements before final submission.

## 7. User Service Integration

The CICD Service communicates with the User Service to retrieve reporter information.

**User Service endpoint:**

```http
GET http://localhost:8081/auth/me
```

The current JWT is forwarded to the User Service using the Bearer authentication header.

This integration allows the Bug Management module to populate:

* `reportedBy` — the authenticated user's ID.
* `reportedByName` — the authenticated user's name.

The integration was tested successfully, and the bug-creation response returned both values.

## 8. Application Configuration

The services use the following local development ports:

| Service      |    Port |
| ------------ | ------: |
| User Service |  `8081` |
| CICD Service |  `8083` |
| MongoDB      | `27017` |

The CICD Service uses MongoDB for bug storage.

Ensure MongoDB is running and that the database configuration in the application's YAML or properties file matches your local environment.

## 9. Running the Application

### Prerequisites

* Java development kit
* Maven wrapper included in the project
* MongoDB
* VS Code or another Java IDE

### Start the User Service

Open a terminal at the project root and run:

```powershell
cd backend/user-service
.\mvnw.cmd spring-boot:run
```

Wait until the User Service starts successfully.

### Start the CICD Service

Open a **second terminal** and run:

```powershell
cd backend/cicd-service
.\mvnw.cmd spring-boot:run
```

Wait until the CICD Service starts successfully.

Keep both services running while testing the APIs.

## 10. API Testing

The endpoints were tested using Postman with a valid JWT.

| Operation         | Method | Endpoint                     | Observed result                          |
| ----------------- | ------ | ---------------------------- | ---------------------------------------- |
| Create bug        | POST   | `/projects/{projectId}/bugs` | `201 Created`                            |
| Get project bugs  | GET    | `/projects/{projectId}/bugs` | `200 OK`                                 |
| Get bug by ID     | GET    | `/bugs/{bugId}`              | Successful response                      |
| Assign bug        | PATCH  | `/bugs/{bugId}/assign`       | `200 OK`                                 |
| Update bug status | PATCH  | `/bugs/{bugId}/status`       | `200 OK`                                 |
| Delete bug        | DELETE | `/bugs/{bugId}`              | Not yet verified with an authorized role |

The reporter ID and reporter name were verified in the bug-creation response.

## 11. Error Handling

The application may return errors for:

* Missing or invalid authentication tokens.
* Insufficient role permissions.
* Invalid request data.
* Missing bugs.
* Business-rule violations, such as attempting to start work on an unassigned bug.

The actual HTTP status depends on the applicable security configuration and exception handling.

## 12. Future Improvements

Potential improvements include:

* Testing every endpoint with authorized and unauthorized users.
* Verifying role permissions against the project requirements.
* Adding pagination and filtering to bug retrieval.
* Improving validation and standardized error responses.
* Adding automated unit and integration tests.
* Testing frontend integration.
* Verifying authorized deletion and the handling of nonexistent bug IDs.

## 13. Conclusion

The Bug Management module provides REST APIs for creating, retrieving, assigning, updating, and deleting bugs in NeuroForge Nexus. It integrates Spring Security and JWT authentication with MongoDB persistence and User Service integration for reporter information.

The primary bug-management operations and reporter-name retrieval were tested successfully. Additional authorization and integration testing remains necessary before considering the module fully verified for production use.

---

