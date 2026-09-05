package com.neuroforge.user.security;

import com.neuroforge.user.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms:86400000}") long expirationMs
    ) {

        this.secretKey = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );

        this.expirationMs = expirationMs;
    }

    /**
     * Creates a signed JWT for a user.
     *
     * JWT contains:
     * - userId
     * - role
     * - subRole
     */
    public String generateToken(User user) {

        Date now = new Date();

        Date expiry = new Date(
                now.getTime() + expirationMs
        );

        return Jwts.builder()

                // Standard JWT subject
                .subject(user.getId())

                // Custom claims
                .claim("userId", user.getId())
                .claim("role", user.getRole())
                .claim("subRole", user.getSubRole())

                // Token timestamps
                .issuedAt(now)
                .expiration(expiry)

                // Sign the token
                .signWith(secretKey)

                .compact();
    }

    /**
     * Extracts and verifies JWT claims.
     */
    public Claims extractClaims(String token) {

        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Gets the user ID from JWT subject.
     */
    public String extractUserId(String token) {

        return extractClaims(token).getSubject();
    }

    /**
     * Checks whether the JWT is valid and not expired.
     */
    public boolean isTokenValid(String token) {

        try {

            Claims claims = extractClaims(token);

            return claims.getExpiration()
                    .after(new Date());

        } catch (Exception e) {

            return false;
        }
    }
}