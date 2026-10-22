package com.neuroforge.cicd.bug.service;

import com.neuroforge.cicd.bug.Bug;
import com.neuroforge.cicd.bug.repository.BugRepository;
import com.neuroforge.cicd.exception.BadRequestException;
import com.neuroforge.cicd.exception.ResourceNotFoundException;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class BugService {

    private final BugRepository bugRepository;

    public BugService(BugRepository bugRepository) {
        this.bugRepository = bugRepository;
    }

    public Bug createBug(Bug bug) {

        if (bug.getTitle() == null || bug.getTitle().isBlank()) {
            throw new BadRequestException("Bug title is required");
        }

        if (bug.getProjectId() == null || bug.getProjectId().isBlank()) {
            throw new BadRequestException("Project ID is required");
        }

        bug.setId(null);
        bug.setTitle(bug.getTitle().trim());
        bug.setStatus(Bug.Status.NEW);

        Instant now = Instant.now();
        bug.setCreatedAt(now);
        bug.setUpdatedAt(now);

        if (bug.getEnvironment() == null) {
            bug.setEnvironment(Bug.Environment.DEVELOPMENT);
        }

        if (bug.getSeverity() == null) {
            bug.setSeverity(Bug.Severity.MEDIUM);
        }

        if (bug.getPriority() == null) {
            bug.setPriority(Bug.Priority.MEDIUM);
        }

        return bugRepository.save(bug);
    }

    public List<Bug> getBugsByProject(String projectId) {
        return bugRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    public Bug getBugById(String bugId) {

        return bugRepository.findById(bugId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Bug not found: " + bugId));
    }

    public Bug assignBug(String bugId, String assignedTo) {

        Bug bug = getBugById(bugId);

        if (bug.getStatus() == Bug.Status.CLOSED) {
            throw new BadRequestException(
                    "A closed bug cannot be reassigned");
        }

        bug.setAssignedTo(
                assignedTo == null || assignedTo.isBlank()
                        ? null
                        : assignedTo.trim()
        );

        bug.setUpdatedAt(Instant.now());

        return bugRepository.save(bug);
    }

    public Bug updateBugStatus(String bugId, Bug.Status newStatus) {

        Bug bug = getBugById(bugId);

        if (newStatus == null) {
            throw new BadRequestException("Bug status is required");
        }

        if (bug.getStatus() == Bug.Status.CLOSED) {
            throw new BadRequestException(
                    "A closed bug cannot change status");
        }

        if (newStatus == Bug.Status.IN_PROGRESS
                && (bug.getAssignedTo() == null
                || bug.getAssignedTo().isBlank())) {

            throw new BadRequestException(
                    "Assign the bug before starting work");
        }

        if (!isAllowedTransition(bug.getStatus(), newStatus)) {
            throw new BadRequestException(
                    "Invalid status transition: "
                            + bug.getStatus() + " -> " + newStatus);
        }

        bug.setStatus(newStatus);
        bug.setUpdatedAt(Instant.now());

        return bugRepository.save(bug);
    }

    private boolean isAllowedTransition(
            Bug.Status current,
            Bug.Status next) {

        return switch (current) {

            case NEW ->
                    next == Bug.Status.CONFIRMED;

            case CONFIRMED ->
                    next == Bug.Status.IN_PROGRESS;

            case IN_PROGRESS ->
                    next == Bug.Status.FIXED;

            case FIXED ->
                    next == Bug.Status.RETEST;

            case RETEST ->
                    next == Bug.Status.CLOSED
                            || next == Bug.Status.REOPENED;

            case REOPENED ->
                    next == Bug.Status.IN_PROGRESS;

            case CLOSED -> false;
        };
    }

}
