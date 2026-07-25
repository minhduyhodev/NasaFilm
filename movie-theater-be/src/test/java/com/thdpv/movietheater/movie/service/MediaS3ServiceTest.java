package com.thdpv.movietheater.movie.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@ExtendWith(MockitoExtension.class)
class MediaS3ServiceTest {

    private static final long CHUNK_BYTES = 8L * 1024 * 1024;
    private static final long TOTAL_BYTES = 20L * 1024 * 1024;

    @Mock
    private S3Client s3Client;

    @Mock
    private ObjectProvider<S3Client> s3ClientProvider;

    @Mock
    private ObjectProvider<S3Presigner> presignerProvider;

    private MediaS3Service service;

    @BeforeEach
    void setUp() {
        when(s3ClientProvider.getIfAvailable()).thenReturn(s3Client);
        when(presignerProvider.getIfAvailable()).thenReturn(null);
        service = new MediaS3Service(
                "https://example-bucket.s3.ap-southeast-1.amazonaws.com",
                "example-bucket",
                900,
                CHUNK_BYTES,
                presignerProvider,
                s3ClientProvider);
    }

    @Test
    void noRangeIsConvertedToCappedPartialResponseWithSecurityHeaders() {
        stubS3Object();

        ResponseEntity<StreamingResponseBody> response =
                service.buildStreamResponse("movie/demo.mp4", null);

        assertEquals(HttpStatus.PARTIAL_CONTENT, response.getStatusCode());
        assertEquals(CHUNK_BYTES, response.getHeaders().getContentLength());
        assertEquals("bytes 0-8388607/20971520",
                response.getHeaders().getFirst(HttpHeaders.CONTENT_RANGE));
        assertEquals("private, no-store", response.getHeaders().getCacheControl());
        assertEquals("no-referrer", response.getHeaders().getFirst("Referrer-Policy"));
        assertEquals("nosniff", response.getHeaders().getFirst("X-Content-Type-Options"));
        assertEquals("inline", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));

        ArgumentCaptor<GetObjectRequest> request = ArgumentCaptor.forClass(GetObjectRequest.class);
        verify(s3Client).getObject(request.capture());
        assertEquals("bytes=0-8388607", request.getValue().range());
    }

    @Test
    void oversizedRangeIsClampedToConfiguredChunkSize() {
        stubS3Object();

        ResponseEntity<StreamingResponseBody> response =
                service.buildStreamResponse("movie/demo.mp4", "bytes=1048576-20000000");

        assertEquals(HttpStatus.PARTIAL_CONTENT, response.getStatusCode());
        assertEquals(CHUNK_BYTES, response.getHeaders().getContentLength());
        assertEquals("bytes 1048576-9437183/20971520",
                response.getHeaders().getFirst(HttpHeaders.CONTENT_RANGE));
    }

    @Test
    void multiRangeRequestIsRejectedWithoutFetchingObjectBytes() {
        when(s3Client.headObject(any(HeadObjectRequest.class))).thenReturn(
                HeadObjectResponse.builder()
                        .contentLength(TOTAL_BYTES)
                        .contentType("video/mp4")
                        .build());

        ResponseEntity<StreamingResponseBody> response =
                service.buildStreamResponse("movie/demo.mp4", "bytes=0-99,200-299");

        assertEquals(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE, response.getStatusCode());
        assertEquals("bytes */20971520",
                response.getHeaders().getFirst(HttpHeaders.CONTENT_RANGE));
        verify(s3Client, never()).getObject(any(GetObjectRequest.class));
    }

    private void stubS3Object() {
        when(s3Client.headObject(any(HeadObjectRequest.class))).thenReturn(
                HeadObjectResponse.builder()
                        .contentLength(TOTAL_BYTES)
                        .contentType("video/mp4")
                        .build());
        when(s3Client.getObject(any(GetObjectRequest.class))).thenAnswer(ignored ->
                new ResponseInputStream<>(
                        GetObjectResponse.builder().build(),
                        AbortableInputStream.create(new ByteArrayInputStream(new byte[] { 1 }))));
        assertTrue(service.isS3ClientAvailable());
    }
}
