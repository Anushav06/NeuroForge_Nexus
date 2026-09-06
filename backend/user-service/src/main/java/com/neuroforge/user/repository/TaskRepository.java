package com.neuroforge.user.repository;

import com.neuroforge.user.model.Task;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends MongoRepository<Task, String> {

    List<Task> findByProjectId(String projectId);

    List<Task> findBySprintId(String sprintId);

    List<Task> findByProjectIdAndSprintId(String projectId, String sprintId);

    List<Task> findByParentTaskId(String parentTaskId);

    List<Task> findByAssignedTo(String assignedTo);

    List<Task> findByBlockedByTaskId(String blockedByTaskId);
}