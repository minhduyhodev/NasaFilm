package com.thdpv.movietheater.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.DecodingException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;

@Component
public class JwtUtils {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;

    public JwtUtils(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiration}") long accessTokenExpirationMs) {
        SecretKey key;
        try {
            key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        } catch (DecodingException | IllegalArgumentException ex) {
            byte[] rawSecret = secret.getBytes(StandardCharsets.UTF_8);
            if (rawSecret.length < 32) {
                throw new IllegalStateException(
                        "app.jwt.secret must be valid Base64 or a plain text secret with at least 32 characters",
                        ex);
            }
            key = Keys.hmacShaKeyFor(rawSecret);
        }
        this.secretKey = key;
        this.accessTokenExpirationMs = accessTokenExpirationMs;
    }

    public String generateToken(String username) {
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpirationMs))
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SignatureException e) {
            logger.error("Invalid JWT signature: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            logger.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    public String generateResetToken(String email, String passwordHash) {
        return Jwts.builder()
                .subject(email)
                .claim("pass", passwordHash)
                .claim("purpose", "RESET_PASSWORD")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 900000)) // 15 minutes
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    public String generateActivationToken(String email, String passwordHash) {
        return Jwts.builder()
                .subject(email)
                .claim("pass", passwordHash)
                .claim("purpose", "ACTIVATE_ACCOUNT")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 259200000L)) // 72 hours
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    public Claims parseResetToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
