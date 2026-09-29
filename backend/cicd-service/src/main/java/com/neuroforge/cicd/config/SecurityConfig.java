//package com.neuroforge.cicd.config;
//
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
//import org.springframework.security.config.annotation.web.builders.HttpSecurity;
//import org.springframework.security.config.http.SessionCreationPolicy;
//import org.springframework.security.web.SecurityFilterChain;
//import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
//
//@Configuration
//@EnableMethodSecurity
//public class SecurityConfig {
//
//    private final JwtAuthFilter jwtAuthFilter;
//
//    public SecurityConfig(
//            JwtAuthFilter jwtAuthFilter
//    ) {
//        this.jwtAuthFilter = jwtAuthFilter;
//    }
//
//    @Bean
//    public SecurityFilterChain securityFilterChain(
//            HttpSecurity http
//    ) throws Exception {
//
//        http
//            .csrf(csrf -> csrf.disable())
//
//            .sessionManagement(session ->
//                    session.sessionCreationPolicy(
//                            SessionCreationPolicy.STATELESS
//                    )
//            )
//
//            .authorizeHttpRequests(auth -> auth
//
//                    // Public webhook endpoints
//                    .requestMatchers(
//                            "/api/public/**"
//                    ).permitAll()
//
//                    // Actuator health
//                    .requestMatchers(
//                            "/actuator/health"
//                            "/actuator/prometheus",
//                            "/actuator/metrics"
//                            "/actuator/**"
//                    ).permitAll()
//
//                    // Everything else requires JWT
//                    .anyRequest().authenticated()
//            )
//
//            .addFilterBefore(
//                    jwtAuthFilter,
//                    UsernamePasswordAuthenticationFilter.class
//            );
//
//        return http.build();
//    }
//}





package com.neuroforge.cicd.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        // Public webhook endpoints
                        .requestMatchers("/api/public/**").permitAll()
                        // Allow public access to Prometheus metrics and health checks
                        .requestMatchers("/actuator/health", "/actuator/prometheus", "/actuator/metrics").permitAll()
                        // Everything else requires JWT
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}