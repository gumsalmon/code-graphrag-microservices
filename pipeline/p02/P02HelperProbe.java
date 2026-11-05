// Targeted harness on unchanged application classes, not a microservice E2E or a gold label.
import com.sun.net.httpserver.HttpServer;
import java.lang.reflect.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.function.Function;
import org.springframework.samples.petclinic.api.application.VisitsServiceClient;
import org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController;
import org.springframework.samples.petclinic.api.dto.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

public class P02HelperProbe {
    static final List<String> events = new ArrayList<>();
    static String q(String s) { return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""; }
    static void event(String name, String fields) { events.add("{\"kind\":" + q(name) + "," + fields + "}"); }
    static void require(boolean ok, String message) { if (!ok) throw new IllegalStateException(message); }
    static Method method(Class<?> c, String name, Class<?>... types) throws Exception {
        Method m = c.getDeclaredMethod(name, types); m.setAccessible(true); return m;
    }
    @SuppressWarnings("unchecked")
    public static void main(String[] args) throws Exception {
        Path output = Path.of(args[0]);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/pets/visits", exchange -> {
            event("actual_webclient_request", "\"raw_uri\":" + q(exchange.getRequestURI().toASCIIString()) +
                ",\"method\":" + q(exchange.getRequestMethod()));
            byte[] body = "{\"items\":[{\"id\":1,\"petId\":7,\"date\":\"2013-01-01\",\"description\":\"rabies shot\"}]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length); exchange.getResponseBody().write(body); exchange.close();
        });
        server.start();
        try {
            VisitsServiceClient client = new VisitsServiceClient(WebClient.builder());
            Field host = VisitsServiceClient.class.getDeclaredField("hostname"); host.setAccessible(true);
            event("default_hostname", "\"observed\":" + q((String) host.get(client)));
            require("http://visits-service/".equals(host.get(client)), "Default destination differs");
            String joined = (String) method(VisitsServiceClient.class, "joinIds", List.class).invoke(client, List.of(7, 8));
            event("joinIds_direct_invocation", "\"result\":" + q(joined)); require(joined.equals("7,8"), "joinIds differs");
            String local = "http://127.0.0.1:" + server.getAddress().getPort() + "/";
            method(VisitsServiceClient.class, "setHostname", String.class).invoke(client, local);
            event("setHostname_direct_invocation", "\"field_after\":" + q((String) host.get(client)));
            require(local.equals(host.get(client)), "Setter did not change destination");
            Visits received = client.getVisitsForPets(List.of(7, 8)).block(Duration.ofSeconds(10));
            require(received != null && received.items().size() == 1 && received.items().get(0).petId() == 7, "Real WebClient fixture response not decoded");
            event("getVisitsForPets_subscription", "\"items\":" + received.items().size());
            // No fake circuit breaker: these two private helpers are invoked
            // directly; the separate real gateway fault probe covers wiring.
            ApiGatewayController controller = new ApiGatewayController(null, null, null);
            OwnerDetails owner = new OwnerDetails(6, "Jean", "Coleman", "fixture", "fixture", "fixture", List.of(
                new PetDetails(7, "Samantha", "2012-09-04", null, new ArrayList<>()),
                new PetDetails(8, "Max", "2012-09-04", null, new ArrayList<>())));
            Function<Visits, OwnerDetails> merge = (Function<Visits, OwnerDetails>) method(ApiGatewayController.class, "addVisitsToOwner", OwnerDetails.class).invoke(controller, owner);
            Visits shuffled = new Visits(List.of(new VisitDetails(2, 8, "2013-01-02", "rabies shot"),
                new VisitDetails(1, 7, "2013-01-01", "rabies shot")));
            OwnerDetails applied = merge.apply(shuffled);
            require(applied == owner && applied.pets().get(0).visits().get(0).petId() == 7 && applied.pets().get(1).visits().get(0).petId() == 8,
                "Returned Function not actually applied or assignments wrong");
            event("addVisitsToOwner_function_applied", "\"owner_id\":6,\"pet7_visit_ids\":[1],\"pet8_visit_ids\":[2]");
            Mono<Visits> empty = (Mono<Visits>) method(ApiGatewayController.class, "emptyVisitsForPets").invoke(controller);
            require(empty.block(Duration.ofSeconds(5)).items().isEmpty(), "Fallback helper result differs");
            event("emptyVisitsForPets_direct_subscription", "\"items\":0,\"circuit_breaker_wiring_proven\":false");
            Files.writeString(output, String.join("\n", events) + "\n", StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
            System.out.println("TARGETED_HELPER_CHECKS_PASS; real compiled helpers + local fixture HTTP; NOT full microservice E2E or impact labels");
        } finally { server.stop(0); }
    }
}
