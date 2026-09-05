package com.neuroforge.user.repository;

import com.neuroforge.user.model.Sprint;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SprintRepository extends MongoRepository<Sprint, String> {

    List<Sprint> findByProjectId(String projectId);
}