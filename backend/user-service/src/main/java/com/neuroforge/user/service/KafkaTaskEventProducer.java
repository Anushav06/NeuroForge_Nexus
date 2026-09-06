package com.neuroforge.user.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neuroforge.user.model.Task;
import com.neuroforge.user.model.TaskEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaTaskEventProducer {

    private static final Logger log = LoggerFactory.getLogger(KafkaTaskEventProducer.class);
    private static final String TOPIC = "task-events";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public KafkaTaskEventProducer(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void publishTaskCreated(Task task) {
        sendEvent("TASK_CREATED", task);
    }

    public void publishTaskUpdated(Task task) {
        sendEvent("TASK_UPDATED", task);
    }

    public void publishTaskDeleted(Task task) {
        sendEvent("TASK_DELETED", task);
    }

    private void sendEvent(String eventType, Task task) {
        if (task == null) return;
        try {
            TaskEvent event = new TaskEvent();
            event.setEventType(eventType);
            event.setTaskId(task.getId());
            event.setProjectId(task.getProjectId());
            event.setSprintId(task.getSprintId());
            event.setStatus(task.getStatus() != null ? String.valueOf(task.getStatus()) : null);
            event.setAssignedTo(task.getAssignedTo());

            String payload = objectMapper.writeValueAsString(event);
            String key = task.getId() != null ? task.getId() : "default";

            kafkaTemplate.send(TOPIC, key, payload);
            log.info("Emitted Kafka event [{}] for task {}: {}", eventType, key, payload);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize TaskEvent for taskId: {}", task.getId(), e);
        } catch (Exception e) {
            log.error("Failed to send Kafka event for taskId: {}", task.getId(), e);
        }
    }
}