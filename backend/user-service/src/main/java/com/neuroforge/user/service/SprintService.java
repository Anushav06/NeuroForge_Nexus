package com.neuroforge.user.service;

import com.neuroforge.user.model.Sprint;
import com.neuroforge.user.repository.ProjectRepository;
import com.neuroforge.user.repository.SprintRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SprintService {

    private final SprintRepository sprintRepository;
    private final ProjectRepository projectRepository;

    public SprintService(
            SprintRepository sprintRepository,
            ProjectRepository projectRepository
    ) {
        this.sprintRepository = sprintRepository;
        this.projectRepository = projectRepository;
    }

    public Sprint createSprint(String projectId, Sprint sprint) {

        validateProject(projectId);
        validateSprint(sprint);

        sprint.setId(null);
        sprint.setProjectId(projectId);

        if (sprint.getStatus() == null || sprint.getStatus().isBlank()) {
            sprint.setStatus("PLANNED");
        }

        return sprintRepository.save(sprint);
    }

    public List<Sprint> getSprintsByProject(String projectId) {

        validateProject(projectId);

        return sprintRepository.findByProjectId(projectId);
    }

    public Sprint getSprint(String id) {

        return sprintRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Sprint not found"));
    }

    public Sprint updateSprint(String id, Sprint updatedSprint) {

        Sprint existingSprint = getSprint(id);

        validateSprint(updatedSprint);

        existingSprint.setName(updatedSprint.getName());
        existingSprint.setGoal(updatedSprint.getGoal());
        existingSprint.setStartDate(updatedSprint.getStartDate());
        existingSprint.setEndDate(updatedSprint.getEndDate());

        if (updatedSprint.getStatus() != null
                && !updatedSprint.getStatus().isBlank()) {
            existingSprint.setStatus(updatedSprint.getStatus());
        }

        return sprintRepository.save(existingSprint);
    }

    public void deleteSprint(String id) {

        if (!sprintRepository.existsById(id)) {
            throw new IllegalArgumentException("Sprint not found");
        }

        sprintRepository.deleteById(id);
    }

    private void validateProject(String projectId) {

        if (projectId == null || projectId.isBlank()) {
            throw new IllegalArgumentException("Project ID is required");
        }

        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project not found");
        }
    }

    private void validateSprint(Sprint sprint) {

        if (sprint == null) {
            throw new IllegalArgumentException("Sprint data is required");
        }

        if (sprint.getName() == null || sprint.getName().isBlank()) {
            throw new IllegalArgumentException("Sprint name is required");
        }

        if (sprint.getStartDate() == null || sprint.getStartDate().isBlank()) {
            throw new IllegalArgumentException("Start date is required");
        }

        if (sprint.getEndDate() == null || sprint.getEndDate().isBlank()) {
            throw new IllegalArgumentException("End date is required");
        }

        if (sprint.getStatus() != null
                && !sprint.getStatus().isBlank()) {

            String status = sprint.getStatus().toUpperCase();

            if (!status.equals("PLANNED")
                    && !status.equals("ACTIVE")
                    && !status.equals("COMPLETED")) {

                throw new IllegalArgumentException(
                        "Invalid sprint status. Use PLANNED, ACTIVE or COMPLETED");
            }

            sprint.setStatus(status);
        }
    }
}