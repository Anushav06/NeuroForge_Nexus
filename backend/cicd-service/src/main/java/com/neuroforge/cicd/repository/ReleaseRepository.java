package com.neuroforge.cicd.repository;

import com.neuroforge.cicd.model.Release;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReleaseRepository
        extends MongoRepository<Release, String> {

    List<Release> findByProjectIdOrderByVersionDesc(
            String projectId
    );

    boolean existsByProjectIdAndVersion(
            String projectId,
            String version
    );
}