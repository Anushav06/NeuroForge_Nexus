package com.neuroforge.user.repository;

import com.neuroforge.user.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {

    // Filter projects where a given user is assigned as a member
    List<Project> findByMemberIdsContaining(String userId);

    // Filter projects led by a specific user
    List<Project> findByLeadId(String leadId);

    // Filter projects assigned to a specific team
    List<Project> findByTeamId(String teamId);

    // Filter by status (e.g., "ACTIVE", "PLANNING", "COMPLETED")
    List<Project> findByStatus(String status);
}