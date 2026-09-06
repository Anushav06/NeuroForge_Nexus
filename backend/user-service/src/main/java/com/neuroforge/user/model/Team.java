package com.neuroforge.user.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "teams")
public class Team {

    @Id
    private String id;

    private String name;

    private String description;

    private String leadId;

    private List<String> memberIds = new ArrayList<>();

    private String createdAt;

    public Team() {
        this.createdAt = Instant.now().toString();
    }

    public Team(
            String id,
            String name,
            String description,
            String leadId,
            List<String> memberIds,
            String createdAt
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.leadId = leadId;
        this.memberIds = memberIds != null ? memberIds : new ArrayList<>();
        this.createdAt = createdAt != null ? createdAt : Instant.now().toString();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLeadId() {
        return leadId;
    }

    public void setLeadId(String leadId) {
        this.leadId = leadId;
    }

    public List<String> getMemberIds() {
        if (memberIds == null) {
            memberIds = new ArrayList<>();
        }
        return memberIds;
    }

    public void setMemberIds(List<String> memberIds) {
        this.memberIds = memberIds != null ? memberIds : new ArrayList<>();
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}