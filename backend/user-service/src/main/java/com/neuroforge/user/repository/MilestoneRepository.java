package com.neuroforge.user.repository;

import com.neuroforge.user.model.Milestone;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MilestoneRepository extends MongoRepository<Milestone, String> {

    List<Milestone> findByProjectId(String projectId);

    List<Milestone> findByStatus(Milestone.Status status);
}