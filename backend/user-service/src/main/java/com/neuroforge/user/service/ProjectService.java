package com.neuroforge.user.service;

import com.neuroforge.user.model.Project;
import com.neuroforge.user.model.Sprint;
import com.neuroforge.user.model.Team;
import com.neuroforge.user.repository.ProjectRepository;
import com.neuroforge.user.repository.SprintRepository;
import com.neuroforge.user.repository.TeamRepository;
import com.neuroforge.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            TeamRepository teamRepository,
            SprintRepository sprintRepository,
            UserRepository userRepository
    ) {
        this.projectRepository = projectRepository;
        this.teamRepository = teamRepository;
        this.sprintRepository = sprintRepository;
        this.userRepository = userRepository;
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public Project getProject(String id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found with id: " + id));
    }

    public Project createProject(Project project) {
        validateProjectForCreation(project);

        if (project.getId() == null || project.getId().isBlank()) {
            project.setId("PRJ-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }

        if (project.getStatus() == null || project.getStatus().isBlank()) {
            project.setStatus("PLANNING");
        }

        project.setCreatedAt(Instant.now().toString());

        Project savedProject = projectRepository.save(project);

        // 1. Synchronize Team members if teamId is provided
        if (project.getTeamId() != null && !project.getTeamId().isBlank()) {
            teamRepository.findById(project.getTeamId()).ifPresent(team -> {
                Set<String> memberSet = new HashSet<>(team.getMemberIds() != null ? team.getMemberIds() : List.of());
                if (project.getMemberIds() != null) {
                    memberSet.addAll(project.getMemberIds());
                }
                if (project.getLeadId() != null && !project.getLeadId().isBlank()) {
                    memberSet.add(project.getLeadId());
                }
                team.setMemberIds(new ArrayList<>(memberSet));
                teamRepository.save(team);
            });
        }

// 2. Always auto-create an initial active sprint for new projects
        String sprintName = (project.getSprint() != null && !project.getSprint().isBlank())
                ? project.getSprint().trim()
                : "Sprint 1";

        Sprint sprint = new Sprint();
        sprint.setProjectId(savedProject.getId());
        sprint.setName(sprintName);
        sprint.setGoal(project.getDescription() != null ? project.getDescription() : "Initial sprint goal");
        sprint.setStartDate(LocalDate.now().toString());
        sprint.setEndDate(project.getDueDate() != null && !project.getDueDate().isBlank()
                ? project.getDueDate()
                : LocalDate.now().plusWeeks(2).toString());
        sprint.setStatus("ACTIVE");
        sprintRepository.save(sprint);

        return savedProject;
    }

    public Project updateProject(String id, Project updated) {
        Project existing = getProject(id);

        if (updated.getName() != null && !updated.getName().isBlank()) {
            existing.setName(updated.getName().trim());
        }
        if (updated.getDescription() != null) {
            existing.setDescription(updated.getDescription());
        }
        if (updated.getStatus() != null && !updated.getStatus().isBlank()) {
            existing.setStatus(updated.getStatus().toUpperCase().trim());
        }
        if (updated.getTeamId() != null) {
            existing.setTeamId(updated.getTeamId());
        }
        if (updated.getLeadId() != null) {
            existing.setLeadId(updated.getLeadId());
        }
        if (updated.getMemberIds() != null) {
            existing.setMemberIds(updated.getMemberIds());
        }
        if (updated.getDueDate() != null) {
            existing.setDueDate(updated.getDueDate());
        }

        return projectRepository.save(existing);
    }

    public void deleteProject(String id) {
        if (!projectRepository.existsById(id)) {
            throw new IllegalArgumentException("Project not found with id: " + id);
        }
        projectRepository.deleteById(id);
    }

    private void validateProjectForCreation(Project project) {
        if (project == null) {
            throw new IllegalArgumentException("Project payload is required");
        }
        if (project.getName() == null || project.getName().isBlank()) {
            throw new IllegalArgumentException("Project name is required");
        }
        if (project.getTeamId() != null && !project.getTeamId().isBlank()) {
            if (!teamRepository.existsById(project.getTeamId())) {
                throw new IllegalArgumentException("Assigned team does not exist");
            }
        }
        if (project.getLeadId() != null && !project.getLeadId().isBlank()) {
            if (!userRepository.existsById(project.getLeadId())) {
                throw new IllegalArgumentException("Project lead does not exist");
            }
        }
    }
}