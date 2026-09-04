package com.neuroforge.user.model;



import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "users")
public class User {
    @Id
    private String id;
    private String name;
    private String email;
    private String role;
    private String subRole;
    private String status;
    private String createdAt;

    public User() {}

    public User(String id, String name, String email, String role, String subRole, String status, String createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.subRole = subRole;
        this.status = status;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getSubRole() { return subRole; }
    public void setSubRole(String subRole) { this.subRole = subRole; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}