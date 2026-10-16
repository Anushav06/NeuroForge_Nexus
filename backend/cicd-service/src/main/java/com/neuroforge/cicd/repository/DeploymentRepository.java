package com.neuroforge.cicd.repository;

import com.neuroforge.cicd.model.Deployment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface DeploymentRepository
        extends MongoRepository<Deployment, String> {

    List<Deployment> findByProjectIdOrderByStartedAtDesc(
            String projectId
    );

    List<Deployment> findByProjectIdAndEnvironmentOrderByStartedAtDesc(
            String projectId,
            Deployment.Environment environment
    );

    Optional<Deployment>
    findTopByProjectIdAndEnvironmentAndStatusOrderByFinishedAtDesc(
            String projectId,
            Deployment.Environment environment,
            Deployment.Status status
    );

    // Used for rollback history
    List<Deployment> findByProjectIdAndStatusOrderByStartedAtDesc(
            String projectId,
            Deployment.Status status
    );
}