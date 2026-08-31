package com.neuroforge.user;

import com.neuroforge.user.model.*;
import com.neuroforge.user.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class DataSeederTest {

    @Autowired private ProjectRepository projectRepository;
    @Autowired private SprintRepository sprintRepository;
    @Autowired private TaskRepository taskRepository;

    @Test
    void seedDataMatchesExpectedOutput() {
        Project project = projectRepository.findAll().stream()
            .filter(p -> p.getName().equals("FinCore Nexus"))
            .findFirst().orElseThrow();

        Sprint sprint = sprintRepository.findAll().stream()
            .filter(s -> s.getSprintNumber() == 12)
            .findFirst().orElseThrow();

        assertEquals(Sprint.Status.ACTIVE, sprint.getStatus());
        assertEquals(23, sprint.getTaskCount());

        List<Task> tasks = taskRepository.findAll().stream()
            .filter(t -> t.getSprintId().equals(sprint.getId()))
            .toList();
        assertEquals(23, tasks.size());
    }
}