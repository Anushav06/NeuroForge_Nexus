package com.neuroforge.user.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Document(collection = "teams")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Team {

    @Id
    private String id;

    private String name;
    private List<String> memberIds;
    private String projectId;

    public int getMemberCount() {
        return memberIds == null ? 0 : memberIds.size();
    }
}