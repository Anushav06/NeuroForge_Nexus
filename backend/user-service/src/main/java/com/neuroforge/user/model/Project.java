
package com.neuroforge.user.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Document(collection = "projects")
public class Project {
    @Id
    private String id;
    private String name;
    private String description;
    private String status;
    private String teamId;
    private String leadId;
    private List<String> memberIds;
    private String sprint;
    private String dueDate;
    private String createdAt;

    public Project() {}

    public Project(String id, String name, String description, String status, String teamId, String leadId, List<String> memberIds, String sprint, String dueDate, String createdAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = status;
        this.teamId = teamId;
        this.leadId = leadId;
        this.memberIds = memberIds;
        this.sprint = sprint;
        this.dueDate = dueDate;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
    public String getLeadId() { return leadId; }
    public void setLeadId(String leadId) { this.leadId = leadId; }
    public List<String> getMemberIds() { return memberIds; }
    public void setMemberIds(List<String> memberIds) { this.memberIds = memberIds; }
    public String getSprint() { return sprint; }
    public void setSprint(String sprint) { this.sprint = sprint; }
    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}