package com.neuroforge.cicd;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CicdServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CicdServiceApplication.class, args);
    }

    
}