package org.springframework.samples.petclinic.api.application;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
public class NegativeClientDynamicUri {

    private final WebClient webClient;

    public NegativeClientDynamicUri(WebClient webClient) {
        this.webClient = webClient;
    }

    public Mono<String> callDynamic(String customUri) {
        return webClient
            .get()
            .uri(customUri)
            .retrieve()
            .bodyToMono(String.class);
    }
}
