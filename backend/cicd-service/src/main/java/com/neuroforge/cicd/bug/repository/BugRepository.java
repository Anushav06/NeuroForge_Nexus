package com.neuroforge.cicd.bug.repository;

import com.neuroforge.cicd.bug.Bug;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BugRepository extends MongoRepository<Bug, String> {

    List<Bug> findByProjectIdOrderByCreatedAtDesc(String projectId);

    List<Bug> findByReportedByOrderByCreatedAtDesc(String reportedBy);

    List<Bug> findByAssignedToOrderByCreatedAtDesc(String assignedTo);

    List<Bug> findByProjectIdAndStatusOrderByCreatedAtDesc(
            String projectId,
            Bug.Status status
    );
}