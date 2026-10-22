package com.neuroforge.user.github;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "github_webhook_events")
public class GitHubWebhookEvent {
    @Id
    private String id;
    private String projectId;
    private String repository;
    private String event;
    private String action;
    private String title;
    private String actor;
    private String url;
    private Instant receivedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getRepository() { return repository; }
    public void setRepository(String repository) { this.repository = repository; }
    public String getEvent() { return event; }
    public void setEvent(String event) { this.event = event; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }
}
