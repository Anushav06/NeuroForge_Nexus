package com.neuroforge.user.service;

import com.neuroforge.user.model.Task;
import com.neuroforge.user.repository.ProjectRepository;
import com.neuroforge.user.repository.SprintRepository;
import com.neuroforge.user.repository.TaskRepository;
import com.neuroforge.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;
    private final KafkaTaskEventProducer kafkaTaskEventProducer;

    public TaskService(
        TaskRepository taskRepository,
        ProjectRepository projectRepository,
        SprintRepository sprintRepository,
        UserRepository userRepository,
        KafkaTaskEventProducer kafkaTaskEventProducer
) {
    this.taskRepository = taskRepository;
    this.projectRepository = projectRepository;
    this.sprintRepository = sprintRepository;
    this.userRepository = userRepository;
    this.kafkaTaskEventProducer = kafkaTaskEventProducer;
}

    // =========================================================
    // CREATE TASK
    // =========================================================

    public Task createTask(String projectId, Task task) {

        validateProject(projectId);
        validateTask(task);

        if (task.getSprintId() == null
                || task.getSprintId().isBlank()) {

            throw new IllegalArgumentException(
                    "Sprint ID is required"
            );
        }

        validateSprint(
                task.getSprintId(),
                projectId
        );

        if (task.getAssignedTo() != null
                && !task.getAssignedTo().isBlank()) {

            validateUser(
                    task.getAssignedTo()
            );
        }

        if (task.getParentTaskId() != null
                && !task.getParentTaskId().isBlank()) {

            validateParentTask(
                    task.getParentTaskId(),
                    projectId
            );
        }

        if (task.getBlockedByTaskId() != null
                && !task.getBlockedByTaskId().isBlank()) {

            validateBlockerTask(
                    task.getBlockedByTaskId(),
                    projectId,
                    null
            );
        }

        task.setId(null);
        task.setProjectId(projectId);

        if (task.getStatus() == null
                || task.getStatus().isBlank()) {

            task.setStatus("TODO");
        }

        if (task.getPriority() == null
                || task.getPriority().isBlank()) {

            task.setPriority("MEDIUM");
        }

        if (task.getProgress() == null) {
            task.setProgress(0);
        }

        Task savedTask = taskRepository.save(task);

kafkaTaskEventProducer.publishTaskCreated(savedTask);

return savedTask;
    }



    // =========================================================
    // GET ALL TASKS FOR PROJECT
    // =========================================================

    public List<Task> getTasksByProject(String projectId) {

        validateProject(projectId);

        return taskRepository.findByProjectId(projectId);
    }

    // =========================================================
    // GET TASKS FOR SPRINT
    // =========================================================

    public List<Task> getTasksBySprint(
            String projectId,
            String sprintId
    ) {

        validateProject(projectId);

        validateSprint(
                sprintId,
                projectId
        );

        return taskRepository.findBySprintId(sprintId);
    }

    // =========================================================
    // GET SINGLE TASK
    // =========================================================

    public Task getTask(String id) {

        return taskRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Task not found"
                        )
                );
    }

    // =========================================================
    // GET SUBTASKS
    // =========================================================

    public List<Task> getSubtasks(String taskId) {

        if (!taskRepository.existsById(taskId)) {

            throw new IllegalArgumentException(
                    "Parent task not found"
            );
        }

        return taskRepository.findByParentTaskId(taskId);
    }

    // =========================================================
    // UPDATE TASK
    // =========================================================

    public Task updateTask(
            String id,
            Task updatedTask
    ) {

        Task existingTask = getTask(id);

        // Allows partial updates
        validateTaskForUpdate(updatedTask);

        // -----------------------------------------------------
        // Sprint
        // -----------------------------------------------------

        if (updatedTask.getSprintId() != null
                && !updatedTask.getSprintId().isBlank()) {

            validateSprint(
                    updatedTask.getSprintId(),
                    existingTask.getProjectId()
            );

            existingTask.setSprintId(
                    updatedTask.getSprintId()
            );
        }

        // -----------------------------------------------------
        // Assignment
        // -----------------------------------------------------

        if (updatedTask.getAssignedTo() != null
                && !updatedTask.getAssignedTo().isBlank()) {

            validateUser(
                    updatedTask.getAssignedTo()
            );

            existingTask.setAssignedTo(
                    updatedTask.getAssignedTo()
            );
        }

        // -----------------------------------------------------
        // Parent Task / Subtask
        // -----------------------------------------------------

        if (updatedTask.getParentTaskId() != null
                && !updatedTask.getParentTaskId().isBlank()) {

            validateParentTask(
                    updatedTask.getParentTaskId(),
                    existingTask.getProjectId()
            );

            existingTask.setParentTaskId(
                    updatedTask.getParentTaskId()
            );
        }

        // -----------------------------------------------------
        // Blocker / Dependency
        // -----------------------------------------------------

        if (updatedTask.getBlockedByTaskId() != null
                && !updatedTask.getBlockedByTaskId().isBlank()) {

            validateBlockerTask(
                    updatedTask.getBlockedByTaskId(),
                    existingTask.getProjectId(),
                    existingTask.getId()
            );

            existingTask.setBlockedByTaskId(
                    updatedTask.getBlockedByTaskId()
            );
        }

        // -----------------------------------------------------
        // Blocker Reason
        // -----------------------------------------------------

        if (updatedTask.getBlockerReason() != null) {

            existingTask.setBlockerReason(
                    updatedTask.getBlockerReason()
            );
        }

        // -----------------------------------------------------
        // Title
        // -----------------------------------------------------

        if (updatedTask.getTitle() != null
                && !updatedTask.getTitle().isBlank()) {

            existingTask.setTitle(
                    updatedTask.getTitle()
            );
        }

        // -----------------------------------------------------
        // Description
        // -----------------------------------------------------

        if (updatedTask.getDescription() != null) {

            existingTask.setDescription(
                    updatedTask.getDescription()
            );
        }

        // -----------------------------------------------------
        // Status
        // -----------------------------------------------------

        if (updatedTask.getStatus() != null
                && !updatedTask.getStatus().isBlank()) {

            existingTask.setStatus(
                    updatedTask.getStatus()
            );
        }

        // -----------------------------------------------------
        // Priority
        // -----------------------------------------------------

        if (updatedTask.getPriority() != null
                && !updatedTask.getPriority().isBlank()) {

            existingTask.setPriority(
                    updatedTask.getPriority()
            );
        }

        // -----------------------------------------------------
        // Story Points
        // -----------------------------------------------------

        if (updatedTask.getStoryPoints() != null) {

            existingTask.setStoryPoints(
                    updatedTask.getStoryPoints()
            );
        }

        // -----------------------------------------------------
        // Progress
        // -----------------------------------------------------

        if (updatedTask.getProgress() != null) {

            existingTask.setProgress(
                    updatedTask.getProgress()
            );
        }

        Task savedTask = taskRepository.save(existingTask);

kafkaTaskEventProducer.publishTaskUpdated(savedTask);

return savedTask;
    }

    // =========================================================
    // SPRINT VELOCITY
    // =========================================================

    public int getSprintVelocity(
            String projectId,
            String sprintId
    ) {

        validateProject(projectId);

        validateSprint(
                sprintId,
                projectId
        );

        List<Task> tasks =
                taskRepository.findBySprintId(sprintId);

        int velocity = 0;

        for (Task task : tasks) {

            if ("DONE".equals(task.getStatus())
                    && task.getStoryPoints() != null) {

                velocity += task.getStoryPoints();
            }
        }

        return velocity;
    }

    public Map<String, Object> getSprintBurndown(
        String projectId,
        String sprintId
) {
    validateProject(projectId);
    validateSprint(sprintId, projectId);

    List<Task> tasks = taskRepository.findBySprintId(sprintId);

    int totalStoryPoints = 0;
    int completedStoryPoints = 0;

    for (Task task : tasks) {
        if (task.getStoryPoints() != null) {
            totalStoryPoints += task.getStoryPoints();

            if ("DONE".equals(task.getStatus())) {
                completedStoryPoints += task.getStoryPoints();
            }
        }
    }

    int remainingStoryPoints =
            totalStoryPoints - completedStoryPoints;

    double completionPercentage = totalStoryPoints == 0
            ? 0
            : (completedStoryPoints * 100.0) / totalStoryPoints;

    return Map.of(
            "projectId", projectId,
            "sprintId", sprintId,
            "totalStoryPoints", totalStoryPoints,
            "completedStoryPoints", completedStoryPoints,
            "remainingStoryPoints", remainingStoryPoints,
            "completionPercentage", completionPercentage
    );
}

    // =========================================================
    // DELETE TASK
    // =========================================================

    public void deleteTask(String id) {

    Task existingTask = getTask(id);

    taskRepository.deleteById(id);

    kafkaTaskEventProducer.publishTaskDeleted(existingTask);
}

    // =========================================================
    // PROJECT VALIDATION
    // =========================================================

    private void validateProject(String projectId) {

        if (projectId == null
                || projectId.isBlank()) {

            throw new IllegalArgumentException(
                    "Project ID is required"
            );
        }

        if (!projectRepository.existsById(projectId)) {

            throw new IllegalArgumentException(
                    "Project not found"
            );
        }
    }

    // =========================================================
    // SPRINT VALIDATION
    // =========================================================

    private void validateSprint(
            String sprintId,
            String projectId
    ) {

        if (sprintId == null
                || sprintId.isBlank()) {

            throw new IllegalArgumentException(
                    "Sprint ID is required"
            );
        }

        if (!sprintRepository.existsById(sprintId)) {

            throw new IllegalArgumentException(
                    "Sprint not found"
            );
        }

        checkSprintBelongsToProject(
                sprintId,
                projectId
        );
    }

    private void checkSprintBelongsToProject(
            String sprintId,
            String projectId
    ) {

        var sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Sprint not found"
                        )
                );

        if (!projectId.equals(
                sprint.getProjectId()
        )) {

            throw new IllegalArgumentException(
                    "Sprint does not belong to this project"
            );
        }
    }

    // =========================================================
    // USER VALIDATION
    // =========================================================

    private void validateUser(String userId) {

        if (!userRepository.existsById(userId)) {

            throw new IllegalArgumentException(
                    "Assigned user not found"
            );
        }
    }

    // =========================================================
    // PARENT TASK VALIDATION
    // =========================================================

    private void validateParentTask(
            String parentTaskId,
            String projectId
    ) {

        Task parentTask = taskRepository
                .findById(parentTaskId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Parent task not found"
                        )
                );

        if (!projectId.equals(
                parentTask.getProjectId()
        )) {

            throw new IllegalArgumentException(
                    "Parent task does not belong to this project"
            );
        }
    }

    // =========================================================
    // BLOCKER / DEPENDENCY VALIDATION
    // =========================================================

    private void validateBlockerTask(
            String blockerTaskId,
            String projectId,
            String currentTaskId
    ) {

        Task blockerTask = taskRepository
                .findById(blockerTaskId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Blocker task not found"
                        )
                );

        // A task cannot block itself
        if (currentTaskId != null
                && blockerTaskId.equals(currentTaskId)) {

            throw new IllegalArgumentException(
                    "A task cannot be blocked by itself"
            );
        }

        // Blocker must belong to the same project
        if (!projectId.equals(
                blockerTask.getProjectId()
        )) {

            throw new IllegalArgumentException(
                    "Blocker task does not belong to this project"
            );
        }
    }

    // =========================================================
    // CREATE VALIDATION
    // =========================================================

    private void validateTask(Task task) {

        if (task == null) {

            throw new IllegalArgumentException(
                    "Task data is required"
            );
        }

        if (task.getTitle() == null
                || task.getTitle().isBlank()) {

            throw new IllegalArgumentException(
                    "Task title is required"
            );
        }

        validateStoryPoints(
                task.getStoryPoints()
        );

        validateProgress(
                task.getProgress()
        );

        validateStatus(task);

        validatePriority(task);
    }

    // =========================================================
    // UPDATE VALIDATION
    // =========================================================

    private void validateTaskForUpdate(
            Task task
    ) {

        if (task == null) {

            throw new IllegalArgumentException(
                    "Task data is required"
            );
        }

        validateStoryPoints(
                task.getStoryPoints()
        );

        validateProgress(
                task.getProgress()
        );

        validateStatus(task);

        validatePriority(task);
    }

    // =========================================================
    // STORY POINT VALIDATION
    // =========================================================

    private void validateStoryPoints(
            Integer storyPoints
    ) {

        if (storyPoints != null
                && storyPoints < 0) {

            throw new IllegalArgumentException(
                    "Story points cannot be negative"
            );
        }
    }

    // =========================================================
    // PROGRESS VALIDATION
    // =========================================================

    private void validateProgress(
            Integer progress
    ) {

        if (progress != null
                && (progress < 0
                || progress > 100)) {

            throw new IllegalArgumentException(
                    "Progress must be between 0 and 100"
            );
        }
    }

    // =========================================================
    // STATUS VALIDATION
    // =========================================================

    private void validateStatus(
            Task task
    ) {

        if (task.getStatus() == null
                || task.getStatus().isBlank()) {

            return;
        }

        String status =
                task.getStatus().toUpperCase();

        if (!status.equals("TODO")
                && !status.equals("IN_PROGRESS")
                && !status.equals("IN_REVIEW")
                && !status.equals("DONE")
                && !status.equals("BLOCKED")) {

            throw new IllegalArgumentException(
                    "Invalid task status. Use TODO, IN_PROGRESS, IN_REVIEW, DONE or BLOCKED"
            );
        }

        task.setStatus(status);
    }

    // =========================================================
    // PRIORITY VALIDATION
    // =========================================================

    private void validatePriority(
            Task task
    ) {

        if (task.getPriority() == null
                || task.getPriority().isBlank()) {

            return;
        }

        String priority =
                task.getPriority().toUpperCase();

        if (!priority.equals("LOW")
                && !priority.equals("MEDIUM")
                && !priority.equals("HIGH")
                && !priority.equals("CRITICAL")) {

            throw new IllegalArgumentException(
                    "Invalid priority. Use LOW, MEDIUM, HIGH or CRITICAL"
            );
        }

        task.setPriority(priority);
    }
}