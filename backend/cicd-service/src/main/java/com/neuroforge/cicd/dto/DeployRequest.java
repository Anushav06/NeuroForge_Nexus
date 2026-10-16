package com.neuroforge.cicd.dto;

import com.neuroforge.cicd.model.Deployment;

public class DeployRequest {

    private Deployment.Environment environment;

    public DeployRequest() {
    }

    public Deployment.Environment getEnvironment() {
        return environment;
    }

    public void setEnvironment(Deployment.Environment environment) {
        this.environment = environment;
    }
}