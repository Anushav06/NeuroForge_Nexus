package com.neuroforge.user.config;

import com.neuroforge.user.model.*;
import com.neuroforge.user.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.util.*;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final MilestoneRepository milestoneRepository;

    public DataSeeder(UserRepository userRepository, TeamRepository teamRepository,
                       ProjectRepository projectRepository, SprintRepository sprintRepository,
                       TaskRepository taskRepository, MilestoneRepository milestoneRepository) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.projectRepository = projectRepository;
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
        this.milestoneRepository = milestoneRepository;
    }

    @Override
    public void run(String... args) {
        if (projectRepository.count() > 0) {
            System.out.println("Seed data already present, skipping.");
            return;
        }

        // 12 team members
        List<String> memberIds = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            User u = new User();
            u.setName("Member " + i);
            u.setEmail("member" + i + "@neuroforge.io");
            u.setRole(i == 1 ? Role.PROJECT_MANAGER : Role.DEVELOPER);
            userRepository.save(u);
            memberIds.add(u.getId());
        }

        Team team = new Team();
        team.setName("FinCore Nexus Team");
        team.setMemberIds(memberIds);
        team = teamRepository.save(team);

        Project project = new Project();
        project.setName("FinCore Nexus");
        project.setDescription("Banking domain SDLC pilot project");
        project.setStatus(Project.Status.ACTIVE);
        project.setTeamId(team.getId());
        project.setStartDate(LocalDate.of(2026, 1, 5));
        project.setReleaseDueDate(LocalDate.of(2026, 6, 20));
        project = projectRepository.save(project);

        team.setProjectId(project.getId());
        teamRepository.save(team);

        Sprint sprint = new Sprint();
        sprint.setSprintNumber(12);
        sprint.setProjectId(project.getId());
        sprint.setStatus(Sprint.Status.ACTIVE);
        sprint.setTaskCount(23);
        sprint.setStartDate(LocalDate.of(2026, 6, 1));
        sprint.setEndDate(LocalDate.of(2026, 6, 14));
        sprint = sprintRepository.save(sprint);

        // 23 tasks distributed across statuses
        Task.Status[] statuses = Task.Status.values();
        for (int i = 1; i <= 23; i++) {
            Task t = new Task();
            t.setTitle("Task " + i);
            t.setSprintId(sprint.getId());
            t.setAssigneeId(memberIds.get(i % memberIds.size()));
            t.setStatus(statuses[i % statuses.length]);
            t.setPriority(Task.Priority.MEDIUM);
            taskRepository.save(t);
        }

        Milestone milestone = new Milestone();
        milestone.setName("Release 2.3");
        milestone.setProjectId(project.getId());
        milestone.setDueDate(LocalDate.of(2026, 6, 20));
        milestone.setStatus(Milestone.Status.UPCOMING);
        milestoneRepository.save(milestone);

        System.out.println("Seed data inserted: FinCore Nexus, Sprint 12 (23 tasks), Release 2.3");
    }
}