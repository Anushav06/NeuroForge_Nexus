package com.neuroforge.user.repository;

import com.neuroforge.user.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByStatus(Project.Status status);
}