package com.thdpv.movietheater.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.frontend-url:*}")
    private String frontendUrl;

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;
    private final WebSocketHandshakeAuthInterceptor webSocketHandshakeAuthInterceptor;

    public WebSocketConfig(
            StompAuthChannelInterceptor stompAuthChannelInterceptor,
            WebSocketHandshakeAuthInterceptor webSocketHandshakeAuthInterceptor) {
        this.stompAuthChannelInterceptor = stompAuthChannelInterceptor;
        this.webSocketHandshakeAuthInterceptor = webSocketHandshakeAuthInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] allowedOrigins = "*".equals(frontendUrl)
                ? new String[] { "*" }
                : new String[] { frontendUrl };

        // Native WebSocket (STOMP) — used by @stomp/stompjs default transport
        registry.addEndpoint("/stomp")
                .addInterceptors(webSocketHandshakeAuthInterceptor)
                .setAllowedOriginPatterns(allowedOrigins);

        // SockJS fallback at /ws (enable with VITE_WS_USE_SOCKJS=true on FE)
        registry.addEndpoint("/ws")
                .addInterceptors(webSocketHandshakeAuthInterceptor)
                .setAllowedOriginPatterns(allowedOrigins)
                .withSockJS();
    }
}
