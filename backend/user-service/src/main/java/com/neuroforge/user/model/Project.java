package com.neuroforge.user.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "projects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Project {

    public enum Status { ACTIVE, ON_HOLD, COMPLETED }

    @Id
    private String id;

    private String name;
    private String description;

    @Indexed
    private Status status;

    private String teamId;
    private String managerId;
    private LocalDate startDate;
    private LocalDate releaseDueDate;
}