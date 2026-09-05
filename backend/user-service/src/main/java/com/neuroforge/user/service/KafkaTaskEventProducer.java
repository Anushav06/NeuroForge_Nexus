package com.neuroforge.user.service;

import com.neuroforge.user.model.Task;
import com.neuroforge.user.model.TaskEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaTaskEventProducer {

    private static final String TOPIC = "task-events";

    private final KafkaTemplate<String, TaskEvent> kafkaTemplate;

    public KafkaTaskEventProducer(
            KafkaTemplate<String, TaskEvent> kafkaTemplate
    ) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishTaskCreated(Task task) {

        TaskEvent event = new TaskEvent(
                "TASK_CREATED",
                task.getId(),
                task.getProjectId(),
                task.getSprintId(),
                task.getStatus(),
                task.getAssignedTo()
        );

        kafkaTemplate.send(
                TOPIC,
                task.getId(),
                event
        );
    }

    public void publishTaskUpdated(Task task) {

        TaskEvent event = new TaskEvent(
                "TASK_UPDATED",
                task.getId(),
                task.getProjectId(),
                task.getSprintId(),
                task.getStatus(),
                task.getAssignedTo()
        );

        kafkaTemplate.send(
                TOPIC,
                task.getId(),
                event
        );
    }

    public void publishTaskDeleted(Task task) {

        TaskEvent event = new TaskEvent(
                "TASK_DELETED",
                task.getId(),
                task.getProjectId(),
                task.getSprintId(),
                task.getStatus(),
                task.getAssignedTo()
        );

        kafkaTemplate.send(
                TOPIC,
                task.getId(),
                event
        );
    }
}