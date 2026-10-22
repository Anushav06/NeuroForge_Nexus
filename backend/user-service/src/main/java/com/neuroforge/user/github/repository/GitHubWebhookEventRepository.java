package com.neuroforge.user.github.repository;

import com.neuroforge.user.github.GitHubWebhookEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GitHubWebhookEventRepository extends MongoRepository<GitHubWebhookEvent, String> {
    List<GitHubWebhookEvent> findTop20ByProjectIdOrderByReceivedAtDesc(String projectId);
    void deleteByProjectId(String projectId);
}
