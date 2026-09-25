package com.neuroforge.cicd.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log =
            LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtService jwtService;

    public JwtAuthFilter(
            JwtService jwtService
    ) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader =
                request.getHeader("Authorization");

        if (authHeader == null ||
                !authHeader.startsWith("Bearer ")) {

            log.debug("No Bearer token on request to {} - continuing unauthenticated",
                    request.getRequestURI());

            filterChain.doFilter(request, response);
            return;
        }

        String token =
                authHeader.substring(7);

        try {

            Claims claims =
                    jwtService.extractClaims(token);

            String role =
                    jwtService.getRole(token);

            String userId =
                    jwtService.getUserId(token);

            if (role != null) {

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                Collections.singletonList(
                                        new SimpleGrantedAuthority(
                                                "ROLE_" + role
                                        )
                                )
                        );

                SecurityContextHolder
                        .getContext()
                        .setAuthentication(authentication);

                log.debug("Authenticated user '{}' with role '{}' for {}",
                        userId, role, request.getRequestURI());

            } else {

                log.warn("Valid JWT for subject '{}' carries no 'role' claim - "
                                + "request will be rejected (403). Claims present: {}",
                        claims.getSubject(),
                        claims.keySet());
            }

        } catch (ExpiredJwtException e) {

            log.warn("Rejected EXPIRED JWT (expired at {}) for {}: {}",
                    e.getClaims().getExpiration(),
                    request.getRequestURI(),
                    e.getMessage());

        } catch (SignatureException e) {

            log.warn("Rejected JWT with INVALID SIGNATURE for {} - the JWT_SECRET "
                            + "in cicd-service probably does not match the one in "
                            + "user-service: {}",
                    request.getRequestURI(),
                    e.getMessage());

        } catch (MalformedJwtException e) {

            log.warn("Rejected MALFORMED JWT for {}: {}",
                    request.getRequestURI(),
                    e.getMessage());

        } catch (UnsupportedJwtException e) {

            log.warn("Rejected UNSUPPORTED JWT for {}: {}",
                    request.getRequestURI(),
                    e.getMessage());

        } catch (JwtException | IllegalArgumentException e) {

            log.warn("Rejected INVALID JWT for {}: {}",
                    request.getRequestURI(),
                    e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}