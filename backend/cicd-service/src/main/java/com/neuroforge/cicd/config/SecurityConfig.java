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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

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

            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            .csrf(csrf -> csrf.disable())

            .sessionManagement(session ->
                    session.sessionCreationPolicy(
                            SessionCreationPolicy.STATELESS
                    )
            )

            .authorizeHttpRequests(auth -> auth

                    // Public webhook endpoints
                    .requestMatchers(
                            "/api/public/**"
                    ).permitAll()

                    // Actuator health
                    .requestMatchers(
                            "/actuator/health"
                    ).permitAll()

                    // Everything else requires JWT
                    .anyRequest().authenticated()
            )

            .addFilterBefore(
                    jwtAuthFilter,
                    UsernamePasswordAuthenticationFilter.class
            );
 a9d77e671977e399a23ac0be1bbfe496de0c8357

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        // Mirror user-service: allow the local Vite / React dev origins.
        // This also makes Spring Security answer CORS preflight (OPTIONS)
        // requests itself, so they are no longer rejected as unauthenticated.
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000",
                "http://127.0.0.1:*"
        ));

        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
        );

        configuration.setAllowedHeaders(
                List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin")
        );

        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}