package com.neuroforge.user.repository;

import com.neuroforge.user.model.Sprint;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SprintRepository extends MongoRepository<Sprint, String> {

    List<Sprint> findByProjectId(String projectId);

    List<Sprint> findByProjectIdAndStatus(String projectId, String status);
}