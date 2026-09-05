package com.neuroforge.user.security;

import com.neuroforge.user.model.User;
import com.neuroforge.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(
            JwtService jwtService,
            UserRepository userRepository
    ) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String requestPath = request.getServletPath();

        // Authentication endpoints are public.
        if (requestPath.equals("/auth/login") || requestPath.equals("/auth/register")) {
        filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");

        // No Authorization header
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendUnauthorized(response);
            return;
        }

        String token = authHeader.substring(7);

        // Invalid or expired JWT
        if (!jwtService.isTokenValid(token)) {
            sendUnauthorized(response);
            return;
        }

        try {
            String userId = jwtService.extractUserId(token);

            Optional<User> userOptional = userRepository.findById(userId);

            if (userOptional.isEmpty()) {
                sendUnauthorized(response);
                return;
            }

            User user = userOptional.get();

            // Do not allow inactive users to access protected APIs.
            if (user.getStatus() != null
                    && !user.getStatus().equalsIgnoreCase("active")) {
                sendUnauthorized(response);
                return;
            }

            String role = user.getRole();

            // Spring Security expects authorities such as ROLE_ADMIN.
            SimpleGrantedAuthority authority =
                    new SimpleGrantedAuthority("ROLE_" + role.toUpperCase());

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            user.getId(),
                            null,
                            List.of(authority)
                    );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            filterChain.doFilter(request, response);

        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            sendUnauthorized(response);
        }
    }

    private void sendUnauthorized(HttpServletResponse response)
            throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");

        response.getWriter().write(
                "{\"message\":\"Unauthorized\"}"
        );
    }
}