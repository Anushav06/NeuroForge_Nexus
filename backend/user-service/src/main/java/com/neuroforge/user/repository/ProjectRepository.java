package com.neuroforge.user.repository;



import com.neuroforge.user.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProjectRepository extends MongoRepository<Project, String> {}