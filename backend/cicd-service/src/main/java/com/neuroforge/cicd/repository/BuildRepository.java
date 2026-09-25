package com.neuroforge.cicd.repository;

import com.neuroforge.cicd.model.Build;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface BuildRepository extends MongoRepository<Build, String> {

    Optional<Build> findTopByPipelineIdOrderByBuildNumberDesc(
            String pipelineId
    );

    Optional<Build> findByPipelineIdAndBuildNumber(
            String pipelineId,
            Integer buildNumber
    );

    List<Build> findByPipelineIdOrderByBuildNumberDesc(
            String pipelineId
    );
}