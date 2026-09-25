package com.neuroforge.cicd.service;

import com.neuroforge.cicd.exception.BadRequestException;
import com.neuroforge.cicd.exception.ResourceNotFoundException;
import com.neuroforge.cicd.model.Pipeline;
import com.neuroforge.cicd.repository.PipelineRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class PipelineService {

    private final PipelineRepository pipelineRepository;

    public PipelineService(PipelineRepository pipelineRepository) {
        this.pipelineRepository = pipelineRepository;
    }

    public List<Pipeline> getPipelinesByProject(String projectId) {
        return pipelineRepository.findByProjectId(projectId);
    }

    public Pipeline createPipeline(String projectId, Pipeline pipeline) {

        if (projectId == null || projectId.isBlank()) {
            throw new BadRequestException("Project ID is required");
        }

        if (pipeline.getName() == null || pipeline.getName().isBlank()) {
            throw new BadRequestException("Pipeline name is required");
        }

        if (pipeline.getRepoUrl() == null || pipeline.getRepoUrl().isBlank()) {
            throw new BadRequestException("Repository URL is required");
        }

        if (pipeline.getDefaultBranch() == null ||
                pipeline.getDefaultBranch().isBlank()) {
            pipeline.setDefaultBranch("main");
        }

        if (pipeline.getProvider() == null) {
            pipeline.setProvider(Pipeline.Provider.GITHUB_ACTIONS);
        }

        if (pipeline.getTriggerType() == null) {
            pipeline.setTriggerType(Pipeline.TriggerType.PUSH);
        }

        if (pipeline.getStages() == null || pipeline.getStages().isEmpty()) {
            pipeline.setStages(new ArrayList<>(List.of(
                    "Build",
                    "Test",
                    "Sonar",
                    "Docker",
                    "Deploy"
            )));
        }

        if (pipelineRepository.existsByProjectIdAndName(
                projectId,
                pipeline.getName())) {

            throw new BadRequestException(
                    "Pipeline with this name already exists for the project");
        }

        pipeline.setId(generatePipelineId());
        pipeline.setProjectId(projectId);
        pipeline.setEnabled(true);
        pipeline.setHealthStatus(Pipeline.HealthStatus.HEALTHY);
        pipeline.setCreatedAt(LocalDateTime.now());

        return pipelineRepository.save(pipeline);
    }

    public Pipeline getPipeline(String id) {

        return pipelineRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Pipeline not found: " + id));
    }

    public Pipeline updatePipeline(String id, Pipeline updatedPipeline) {

        Pipeline existing = getPipeline(id);

        if (updatedPipeline.getName() != null &&
                !updatedPipeline.getName().isBlank()) {
            existing.setName(updatedPipeline.getName());
        }

        if (updatedPipeline.getRepoUrl() != null &&
                !updatedPipeline.getRepoUrl().isBlank()) {
            existing.setRepoUrl(updatedPipeline.getRepoUrl());
        }

        if (updatedPipeline.getDefaultBranch() != null &&
                !updatedPipeline.getDefaultBranch().isBlank()) {
            existing.setDefaultBranch(
                    updatedPipeline.getDefaultBranch());
        }

        if (updatedPipeline.getProvider() != null) {
            existing.setProvider(updatedPipeline.getProvider());
        }

        if (updatedPipeline.getStages() != null &&
                !updatedPipeline.getStages().isEmpty()) {
            existing.setStages(updatedPipeline.getStages());
        }

        if (updatedPipeline.getTriggerType() != null) {
            existing.setTriggerType(updatedPipeline.getTriggerType());
        }

        if (updatedPipeline.getCronExpression() != null) {
            existing.setCronExpression(
                    updatedPipeline.getCronExpression());
        }

        return pipelineRepository.save(existing);
    }

    public void deletePipeline(String id) {

        Pipeline pipeline = getPipeline(id);

        pipelineRepository.delete(pipeline);
    }

    public Pipeline updateEnabledStatus(String id, boolean enabled) {

        Pipeline pipeline = getPipeline(id);

        pipeline.setEnabled(enabled);

        return pipelineRepository.save(pipeline);
    }

    private String generatePipelineId() {

        String shortId = UUID.randomUUID()
                .toString()
                .substring(0, 4)
                .toUpperCase();

        return "PIPE-" + shortId;
    }
}