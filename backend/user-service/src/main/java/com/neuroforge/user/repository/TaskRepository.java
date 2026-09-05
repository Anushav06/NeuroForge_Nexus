package com.neuroforge.user.repository;

import com.neuroforge.user.model.Task;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskRepository extends MongoRepository<Task, String> {

    List<Task> findByProjectId(String projectId);

    List<Task> findBySprintId(String sprintId);

    List<Task> findByParentTaskId(String parentTaskId);
}