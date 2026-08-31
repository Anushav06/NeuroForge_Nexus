package com.neuroforge.user.repository;

import com.neuroforge.user.model.Team;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface TeamRepository extends MongoRepository<Team, String> {

    Optional<Team> findByProjectId(String projectId);

    List<Team> findByNameContainingIgnoreCase(String name);
}