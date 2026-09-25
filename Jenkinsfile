pipeline {
    agent any

    tools {
        jdk 'Java 21'
        maven 'Maven 3'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Test') {
            steps {
                dir('backend/cicd-service') {
                    sh 'mvn clean package -DskipTests'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    docker.image('neuroforge/cicd-service:latest').build('-f backend/cicd-service/Dockerfile .')
                }
            }
        }
    }
}