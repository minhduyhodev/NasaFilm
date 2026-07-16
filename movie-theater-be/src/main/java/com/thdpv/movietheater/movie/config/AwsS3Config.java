package com.thdpv.movietheater.movie.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
@ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${app.s3.access-key-id:}') && T(org.springframework.util.StringUtils).hasText('${app.s3.secret-access-key:}')")
public class AwsS3Config {

    @Bean(destroyMethod = "close")
    public S3Client s3Client(
            @Value("${app.s3.region}") String region,
            @Value("${app.s3.access-key-id}") String accessKeyId,
            @Value("${app.s3.secret-access-key}") String secretAccessKey) {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .build();
    }

    @Bean(destroyMethod = "close")
    public S3Presigner s3Presigner(
            @Value("${app.s3.region}") String region,
            @Value("${app.s3.access-key-id}") String accessKeyId,
            @Value("${app.s3.secret-access-key}") String secretAccessKey) {
        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .build();
    }
}
