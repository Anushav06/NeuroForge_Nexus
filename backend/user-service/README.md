\# NeuroForge Nexus — User Service Backend



The core identity, access management, and project coordination microservice for the \*\*NeuroForge Nexus\*\* platform. Built with Spring Boot 4.1.1 and Java 21, it interfaces with MongoDB to manage organizational hierarchies, team assignments, RBAC-governed user accounts, and project metadata.



\---



\## Tech Stack



| Component | Technology | Version / Spec |

| :--- | :--- | :--- |

| \*\*Language\*\* | Java | OpenJDK 21 (LTS) |

| \*\*Framework\*\* | Spring Boot | 4.1.1 |

| \*\*Database\*\* | MongoDB | 7.x / 6.x (`localhost:27017`) |

| \*\*Security\*\* | Spring Security | Permissive Dev Filter / RBAC |

| \*\*Build Tool\*\* | Apache Maven | Maven Wrapper (`mvnw`) |

| \*\*Monitoring\*\* | Spring Boot Actuator | Health \& Metrics |



\---



\## Project Structure



```text

backend/user-service/

├── src/

│   ├── main/

│   │   ├── java/com/neuroforge/user/

│   │   │   ├── UserServiceApplication.java    # Application entry point

│   │   │   ├── config/

│   │   │   │   ├── CorsConfig.java            # WebMvc CORS mapping (Vite 5173 / React 3000)

│   │   │   │   ├── DataSeeder.java            # Automated demo data populator

│   │   │   │   └── SecurityConfig.java        # SecurityFilterChain \& CORS policies

│   │   │   ├── controller/

│   │   │   │   ├── AuthController.java        # Login, registration, \& JWT issuance

│   │   │   │   └── NexusController.java       # Users, teams, projects \& dashboard stats

│   │   │   ├── model/

│   │   │   │   ├── Project.java               # Project document model

│   │   │   │   ├── Role.java                  # RBAC Enum (ADMIN, LEAD, EMPLOYEE, etc.)

│   │   │   │   ├── Team.java                  # Team document model

│   │   │   │   └── User.java                  # User account document model

│   │   │   └── repository/

│   │   │       ├── ProjectRepository.java     # MongoRepository for projects

│   │   │       ├── TeamRepository.java        # MongoRepository for teams

│   │   │       └── UserRepository.java        # MongoRepository with findByEmail

│   │   └── resources/

│   │       └── application.yaml               # Server port, Mongo URI, and Actuator config

├── pom.xml                                    # Maven dependencies \& build plugin config

└── mvnw.cmd / mvnw                            # Maven wrapper executables

