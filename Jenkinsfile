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
                    sh 'docker build -t neuroforge/cicd-service:latest -f backend/cicd-service/Dockerfile .'
                }
            }
        }
    }
}
