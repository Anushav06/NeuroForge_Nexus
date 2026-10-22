package com.neuroforge.user.github;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "github_connections")
public class GitHubConnection {
    @Id
    private String id;
    private String projectId;
    private String repositoryUrl;
    private String owner;
    private String repository;
    private String encryptedAccessToken;
    private String encryptedWebhookSecret;
    private Long webhookId;
    private String webhookError;
    private Instant connectedAt;
    private Instant lastWebhookAt;
    private String lastWebhookEvent;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getRepositoryUrl() { return repositoryUrl; }
    public void setRepositoryUrl(String repositoryUrl) { this.repositoryUrl = repositoryUrl; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public String getRepository() { return repository; }
    public void setRepository(String repository) { this.repository = repository; }
    public String getEncryptedAccessToken() { return encryptedAccessToken; }
    public void setEncryptedAccessToken(String encryptedAccessToken) { this.encryptedAccessToken = encryptedAccessToken; }
    public String getEncryptedWebhookSecret() { return encryptedWebhookSecret; }
    public void setEncryptedWebhookSecret(String encryptedWebhookSecret) { this.encryptedWebhookSecret = encryptedWebhookSecret; }
    public Long getWebhookId() { return webhookId; }
    public void setWebhookId(Long webhookId) { this.webhookId = webhookId; }
    public String getWebhookError() { return webhookError; }
    public void setWebhookError(String webhookError) { this.webhookError = webhookError; }
    public Instant getConnectedAt() { return connectedAt; }
    public void setConnectedAt(Instant connectedAt) { this.connectedAt = connectedAt; }
    public Instant getLastWebhookAt() { return lastWebhookAt; }
    public void setLastWebhookAt(Instant lastWebhookAt) { this.lastWebhookAt = lastWebhookAt; }
    public String getLastWebhookEvent() { return lastWebhookEvent; }
    public void setLastWebhookEvent(String lastWebhookEvent) { this.lastWebhookEvent = lastWebhookEvent; }
}
