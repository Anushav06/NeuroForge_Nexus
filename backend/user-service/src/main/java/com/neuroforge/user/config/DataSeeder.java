package com.neuroforge.user.config;

import com.neuroforge.user.model.Project;
import com.neuroforge.user.model.Team;
import com.neuroforge.user.model.User;
import com.neuroforge.user.repository.ProjectRepository;
import com.neuroforge.user.repository.TeamRepository;
import com.neuroforge.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;

    public DataSeeder(UserRepository userRepository, TeamRepository teamRepository, ProjectRepository projectRepository) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.projectRepository = projectRepository;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            userRepository.saveAll(List.of(
                    new User("USR-0001", "Priya Sharma", "admin@neuroforge.dev", "ADMIN", null, "active", "2026-01-12"),
                    new User("USR-0002", "Marcus Lee", "marcus.lee@neuroforge.dev", "PROJECT_LEAD", null, "active", "2026-01-15"),
                    new User("USR-0003", "Elena Vasquez", "elena.vasquez@neuroforge.dev", "PROJECT_MANAGER", null, "active", "2026-01-19"),
                    new User("USR-0004", "Tomiwa Okafor", "tomiwa.okafor@neuroforge.dev", "TEAM_LEAD", null, "active", "2026-01-22"),
                    new User("USR-0005", "Ravi Menon", "ravi.menon@neuroforge.dev", "EMPLOYEE", "Developer", "active", "2026-02-02"),
                    new User("USR-0006", "Sara Lindqvist", "sara.lindqvist@neuroforge.dev", "EMPLOYEE", "Tester", "active", "2026-02-09"),
                    new User("USR-0007", "Daniel Cho", "daniel.cho@neuroforge.dev", "EMPLOYEE", "Senior", "active", "2026-02-14"),
                    new User("USR-0008", "Amara Diallo", "amara.diallo@neuroforge.dev", "EMPLOYEE", "Junior", "active", "2026-02-20")
            ));

            teamRepository.saveAll(List.of(
        new Team(
                "TEAM-001",
                "Core Forge",
                "Platform, auth & core services",
                "USR-0002",
                List.of("USR-0002", "USR-0005", "USR-0007"),
                "2026-01-15"
        ),

        new Team(
                "TEAM-002",
                "Quality Hearth",
                "QA automation & release gating",
                "USR-0003",
                List.of("USR-0003", "USR-0006", "USR-0008"),
                "2026-01-19"
        ),

        new Team(
                "TEAM-003",
                "Circuit Breakers",
                "CI/CD & infrastructure tooling",
                "USR-0004",
                List.of("USR-0004", "USR-0005", "USR-0006"),
                "2026-01-22"
        )
));

            projectRepository.saveAll(List.of(
                    new Project("PRJ-1036", "Atlas Auth Service", "OAuth2, SSO and session hardening.", "ACTIVE", "TEAM-001", "USR-0002", List.of("USR-0002", "USR-0005", "USR-0007"), "Sprint 14", "2026-09-18", "2026-06-01"),
                    new Project("PRJ-1037", "Hermes Notification Pipeline", "Fan-out email/push notifications.", "PLANNING", "TEAM-001", "USR-0003", List.of("USR-0003", "USR-0005"), "Sprint 15", "2026-10-02", "2026-06-15"),
                    new Project("PRJ-1038", "Vulcan Deploy Orchestrator", "One-click blue/green deploys.", "BLOCKED", "TEAM-003", "USR-0004", List.of("USR-0004", "USR-0006"), "Sprint 14", "2026-09-25", "2026-05-20"),
                    new Project("PRJ-1039", "Aegis Audit Trail", "Immutable audit log for privileged actions.", "ACTIVE", "TEAM-002", "USR-0003", List.of("USR-0003", "USR-0006", "USR-0008"), "Sprint 14", "2026-09-11", "2026-05-28"),
                    new Project("PRJ-1040", "Chimera Report Engine", "Scheduled CSV/PDF exports.", "PLANNING", "TEAM-001", "USR-0002", List.of("USR-0002", "USR-0007"), "Sprint 16", "2026-10-30", "2026-07-04"),
                    new Project("PRJ-1041", "Icarus Client SDK", "Typed TypeScript SDK for public API.", "ACTIVE", "TEAM-003", "USR-0004", List.of("USR-0004", "USR-0005", "USR-0006"), "Sprint 15", "2026-10-16", "2026-07-10")
            ));
            System.out.println("Clean seed data populated successfully!");
        }
    }
}