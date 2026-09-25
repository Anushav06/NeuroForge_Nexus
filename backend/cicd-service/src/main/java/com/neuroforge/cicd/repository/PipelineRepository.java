package com.neuroforge.cicd.repository;

import com.neuroforge.cicd.model.Pipeline;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PipelineRepository
        extends MongoRepository<Pipeline, String> {

    List<Pipeline> findByProjectId(String projectId);

    boolean existsByProjectIdAndName(
            String projectId,
            String name
    );

    Optional<Pipeline> findFirstByName(String name);
}