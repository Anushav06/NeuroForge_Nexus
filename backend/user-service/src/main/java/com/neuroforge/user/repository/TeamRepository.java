package com.neuroforge.user.repository;



import com.neuroforge.user.model.Team;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TeamRepository extends MongoRepository<Team, String> {}