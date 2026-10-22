package com.neuroforge.user.github.repository;

import com.neuroforge.user.github.GitHubConnection;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface GitHubConnectionRepository extends MongoRepository<GitHubConnection, String> {
    Optional<GitHubConnection> findByProjectId(String projectId);
    Optional<GitHubConnection> findByIdAndProjectId(String id, String projectId);
}
