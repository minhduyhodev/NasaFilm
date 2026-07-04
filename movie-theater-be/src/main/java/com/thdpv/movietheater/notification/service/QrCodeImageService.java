package com.thdpv.movietheater.notification.service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;

import org.springframework.stereotype.Service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

@Service
public class QrCodeImageService {

    private static final int DEFAULT_SIZE = 200;

    public String toBase64PngDataUri(String content) {
        return toBase64PngDataUri(content, DEFAULT_SIZE);
    }

    public String toBase64PngDataUri(String content, int size) {
        if (content == null || content.isBlank()) {
            return "";
        }
        try {
            QRCodeWriter writer = new QRCodeWriter();
            var hints = java.util.Map.of(
                    EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H,
                    EncodeHintType.MARGIN, 1,
                    EncodeHintType.CHARACTER_SET, "UTF-8");
            BitMatrix matrix = writer.encode(content.trim(), BarcodeFormat.QR_CODE, size, size, hints);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (Exception ex) {
            return "";
        }
    }
}
