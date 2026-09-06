
# NeuroForge Nexus – Backend

## Overview

The NeuroForge Nexus backend is developed using Java Spring Boot and provides REST APIs for authentication, project management, team management, sprint management, and task management.

The backend uses MongoDB for persistent data storage and Spring Kafka for publishing task-related events.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| Java | Backend programming language |
| Spring Boot | Backend framework |
| Spring Security | Authentication and authorization |
| JWT | Token-based authentication |
| BCrypt | Password hashing |
| Spring Data MongoDB | Database access |
| MongoDB | Persistent database |
| Spring Kafka | Kafka event publishing |
| Maven | Build and dependency management |

---

## Backend Project Structure

```text
backend/
│
├── src/
│   └── main/
│       ├── java/
│       │   └── com/
│       │       └── neuroforge/
│       │           └── user/
│       │               ├── config/
│       │               │   └── SecurityConfig.java
│       │               │
│       │               ├── controller/
│       │               │   ├── AuthController.java
│       │               │   ├── ProjectController.java
│       │               │   ├── TeamController.java
│       │               │   ├── SprintController.java
│       │               │   └── TaskController.java
│       │               │
│       │               ├── model/
│       │               │   ├── User.java
│       │               │   ├── Project.java
│       │               │   ├── Team.java
│       │               │   ├── Sprint.java
│       │               │   ├── Task.java
│       │               │   └── TaskEvent.java
│       │               │
│       │               ├── repository/
│       │               │   ├── UserRepository.java
│       │               │   ├── ProjectRepository.java
│       │               │   ├── TeamRepository.java
│       │               │   ├── SprintRepository.java
│       │               │   └── TaskRepository.java
│       │               │
│       │               └── service/
│       │                   ├── AuthService.java
│       │                   ├── JwtService.java
│       │                   ├── ProjectService.java
│       │                   ├── TeamService.java
│       │                   ├── SprintService.java
│       │                   ├── TaskService.java
│       │                   └── KafkaTaskEventProducer.java
│       │
│       └── resources/
│           └── application.yaml
│
├── pom.xml
└── mvnw.cmd
````

---

# Completed Backend Features

## Milestone 1 – Authentication & Project Management

### Authentication

* User registration
* User login
* BCrypt password hashing
* JWT token generation
* JWT token validation
* JWT authentication filter
* `/auth/me` endpoint
* Stateless authentication using Spring Security
* Role-Based Access Control (RBAC)
* Protected backend endpoints

### Project Management

* Project creation
* Project retrieval
* Project and user relationship
* Employee-specific project access

### Team Management

* Team creation
* Team update
* Team deletion
* Adding team members
* Removing team members
* Role-based protection for team operations

---

# Milestone 2 – Sprint & Task Management

## Sprint Management

* Sprint creation
* Sprint retrieval
* Sprint update
* Sprint deletion
* Sprint-project association
* Sprint status management
* Sprint start and end dates
* Retrieval of tasks belonging to a sprint

## Task Management

* Task creation
* Task retrieval
* Task update
* Task deletion
* Task assignment
* Task status management
* Kanban workflow support
* Story point tracking
* Task progress tracking

## Subtask Management

Tasks support parent-child relationships using:

```text
parentTaskId
```

This allows a task to have multiple subtasks.


# Sprint Metrics

## Sprint Velocity

The backend calculates sprint velocity based on completed tasks and their story points.

Endpoint:

```text
GET /projects/{projectId}/tasks/sprint/{sprintId}/velocity
```

## Sprint Burndown

The backend provides sprint progress information including:

* Total story points
* Completed story points
* Remaining story points
* Completion percentage

Endpoint:

```text
GET /projects/{projectId}/tasks/sprint/{sprintId}/burndown
```

---

# Kafka Integration

Spring Kafka has been integrated into the backend for task event publishing.

## Kafka Topic

```text
task-events
```

## Supported Events

### Task Created

```text
TASK_CREATED
```

### Task Updated

```text
TASK_UPDATED
```

### Task Deleted

```text
TASK_DELETED
```

The backend publishes these events through:

```text
KafkaTaskEventProducer
```

The producer is integrated with the task service so that task operations can generate corresponding Kafka events.

### Current Kafka Configuration

```text
Bootstrap Server: localhost:9092
Topic: task-events
```

> Note: `localhost:9092` is the current local development configuration. When running the complete system using Docker, the Kafka bootstrap server may need to be changed to the Kafka Docker service/container name.

---

# Backend Configuration

## Server

```text
Port: 8081
```

Backend base URL:

```text
http://localhost:8081
```

## MongoDB

Database:

```text
nexus_user_db
```

Local MongoDB connection:

```text
mongodb://localhost:27017/nexus_user_db
```

The backend uses the environment variable:

```text
MONGO_URI
```

Example:

```powershell
$env:MONGO_URI="mongodb://localhost:27017/nexus_user_db"
```

## JWT

The backend uses:

```text
JWT_SECRET
```

for JWT signing.


For deployment, a secure secret should be provided through environment variables.

---

# Running the Backend Locally

## Prerequisites

Make sure the following are available:

* Java
* MongoDB
* Maven / Maven Wrapper
* Kafka (required for Kafka event publishing)

## Start MongoDB

Make sure the MongoDB server is running.

Set the MongoDB environment variable:

```powershell
$env:MONGO_URI="mongodb://localhost:27017/nexus_user_db"
```

## Start the Backend

From the backend directory:

```powershell
.\mvnw.cmd spring-boot:run
```

The backend will start on:

```text
http://localhost:8081
```

---


### Services required for integration

| Service             | Current Configuration |
| ------------------- | --------------------- |
| Spring Boot Backend | `8081`                |
| MongoDB             | `localhost:27017`     |
| MongoDB Database    | `nexus_user_db`       |
| Kafka               | `localhost:9092`      |
| Kafka Topic         | `task-events`         |

---

# Deployment Note

The backend implementation and Kafka producer integration are completed.

Docker containerization, Kafka broker setup, networking, and deployment configuration can be handled as part of the deployment/integration setup.

When integrating the backend with Docker:

1. Provide `MONGO_URI`
2. Provide `JWT_SECRET`
3. Configure the MongoDB service
4. Configure the Kafka broker
5. Update the Kafka bootstrap server from `localhost:9092` to the appropriate Docker service name if required
6. Ensure the `task-events` Kafka topic is available


