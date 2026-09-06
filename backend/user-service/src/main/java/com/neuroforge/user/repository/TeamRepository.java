package com.neuroforge.user.repository;

import com.neuroforge.user.model.Team;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRepository extends MongoRepository<Team, String> {

    // Find a team by its unique name (e.g. "Core Infrastructure")
    Optional<Team> findByName(String name);

    // Find all teams led by a specific user ID
    List<Team> findByLeadId(String leadId);

    // Find all teams where a specific user is in the memberIds list
    List<Team> findByMemberIdsContaining(String userId);
}