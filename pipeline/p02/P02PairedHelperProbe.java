// Targeted measurement of dataset application classes, not evaluated CIA output.
// The same unchanged consumer JAR is used against each real provider snapshot.
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.*;
import java.lang.reflect.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import org.springframework.samples.petclinic.api.application.VisitsServiceClient;
import org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController;
import org.springframework.samples.petclinic.api.dto.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

public class P02PairedHelperProbe {
    static final ObjectMapper mapper = new ObjectMapper().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION);
    static BufferedWriter stream;
    static String group;
    static String snapshot;
    static int repetition;
    static synchronized void event(String kind, Object data) throws IOException {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("kind", kind); row.put("group_id", group); row.put("snapshot", snapshot);
        row.put("repetition", repetition); row.put("timestamp_utc", Instant.now().toString()); row.put("data", data);
        stream.write(mapper.writeValueAsString(row)); stream.newLine(); stream.flush();
    }
    static void checkedEvent(String kind, Object data) {
        try { event(kind, data); } catch (IOException error) { throw new UncheckedIOException(error); }
    }
    static Method method(Class<?> type, String name, Class<?>... parameters) throws ReflectiveOperationException {
        Method result = type.getDeclaredMethod(name, parameters); result.setAccessible(true); return result;
    }
    static String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }
    static Object tree(Object value) { return mapper.valueToTree(value); }
    static void save(Path directory, String name, Object value) throws Exception {
        Files.writeString(directory.resolve(name), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(value) + "\n",
            StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
    }
    @SuppressWarnings("unchecked")
    public static void main(String[] args) throws Exception {
        if (args.length != 6) throw new IllegalArgumentException("input-directory output-directory group snapshot repetition provider-origin");
        Path input = Path.of(args[0]), output = Path.of(args[1]);
        group = args[2]; snapshot = args[3]; repetition = Integer.parseInt(args[4]);
        if (!(snapshot.equals("baseline") || snapshot.equals("mutated")) || repetition < 1 || repetition > 2 ||
            !group.equals(snapshot + "-r" + repetition) || !args[5].equals("http://visits-service:8082/"))
            throw new IllegalArgumentException("Only fixed private provider/group bindings");
        Files.createDirectories(output);
        try (BufferedWriter writer = Files.newBufferedWriter(output.resolve("events.ndjson"), StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW)) {
            stream = writer;
            try {
                Map<String, Object> classes = new LinkedHashMap<>();
                for (Class<?> type : List.of(VisitsServiceClient.class, ApiGatewayController.class, OwnerDetails.class,
                        PetDetails.class, PetType.class, Visits.class, VisitDetails.class)) {
                    String resource = "/" + type.getName().replace('.', '/') + ".class";
                    try (InputStream bytes = type.getResourceAsStream(resource)) {
                        if (bytes == null) throw new IOException("Missing loaded application class " + resource);
                        classes.put(type.getName(), Map.of("resource", resource.substring(1), "sha256", sha256(bytes.readAllBytes()),
                            "code_source", type.getProtectionDomain().getCodeSource().getLocation().toString()));
                    }
                }
                event("application_identity", Map.of("classes", classes, "java_version", System.getProperty("java.version"),
                    "java_vendor", System.getProperty("java.vendor"), "consumer_source_modified", false));
                byte[] ownerBytes = Files.readAllBytes(input.resolve("owner.body")), visitBytes = Files.readAllBytes(input.resolve("provider.body"));
                // Provider PetType has id/name; the unchanged consumer PetType
                // record declares only name. Preserve raw bytes and explicitly
                // record this one-field DTO projection, never ignore all unknowns.
                JsonNode rawOwner = mapper.readTree(ownerBytes);
                JsonNode projectedOwner = rawOwner.deepCopy();
                List<Map<String, Object>> removedFields = new ArrayList<>();
                JsonNode pets = projectedOwner.get("pets");
                for (int index = 0; index < pets.size(); index++) {
                    ObjectNode type = (ObjectNode) pets.get(index).get("type");
                    if (type.has("id")) {
                        JsonNode removed = type.remove("id");
                        removedFields.add(Map.of("json_pointer", "/pets/" + index + "/type/id", "value", removed));
                    }
                }
                Map<String, Object> projection = Map.of("policy", "remove_pets_type_id_only_for_declared_consumer_record", "removed_fields", removedFields);
                save(output, "owner-projection.json", Map.of("raw_owner", rawOwner, "projected_owner", projectedOwner, "projection", projection));
                OwnerDetails owner = mapper.treeToValue(projectedOwner, OwnerDetails.class);
                Visits providerVisits = mapper.readValue(visitBytes, Visits.class);
                event("raw_input_binding", Map.of("owner_sha256", sha256(ownerBytes), "provider_visits_sha256", sha256(visitBytes),
                    "owner_projection", projection,
                    "decoder", "targeted strict ObjectMapper after recorded PetType.id projection; not production application configuration"));

                WebClient.Builder builder = WebClient.builder().filter((request, next) -> {
                    checkedEvent("actual_client_request", Map.of("method", request.method().name(), "url", request.url().toASCIIString()));
                    return next.exchange(request).doOnNext(response -> checkedEvent("actual_client_response", Map.of("status", response.statusCode().value())));
                });
                VisitsServiceClient client = new VisitsServiceClient(builder);
                List<Integer> petIds = List.of(7, 8);
                Object joined = method(VisitsServiceClient.class, "joinIds", List.class).invoke(client, petIds);
                event("joinIds_direct_return", Map.of("input", petIds, "returned_type", joined.getClass().getName(), "returned", joined));
                Field hostname = VisitsServiceClient.class.getDeclaredField("hostname"); hostname.setAccessible(true);
                String beforeHost = (String) hostname.get(client);
                method(VisitsServiceClient.class, "setHostname", String.class).invoke(client, args[5]);
                event("setHostname_direct_assignment", Map.of("input", args[5], "field_before", beforeHost,
                    "field_after", (String) hostname.get(client), "scope", "targeted setter invocation; production setter callsite not traced"));
                Visits decoded = client.getVisitsForPets(petIds).block(Duration.ofSeconds(20));
                if (decoded == null) throw new IllegalStateException("Client returned null");
                save(output, "actual-client-decoded.json", decoded);
                event("client_subscription_completed", Map.of("decoded", tree(decoded), "provider", "real pinned Visits service in this run-owned network"));

                ApiGatewayController controller = new ApiGatewayController(null, null, null);
                Object beforeOwner = tree(owner);
                Function<Visits, OwnerDetails> merge = (Function<Visits, OwnerDetails>) method(ApiGatewayController.class, "addVisitsToOwner", OwnerDetails.class).invoke(controller, owner);
                OwnerDetails afterOwner = merge.apply(providerVisits);
                save(output, "merge-input-owner.json", beforeOwner);
                save(output, "merge-input-visits.json", providerVisits);
                save(output, "merge-output-owner.json", afterOwner);
                event("addVisitsToOwner_function_applied", Map.of("owner_before", beforeOwner, "visits_input", tree(providerVisits),
                    "owner_after", tree(afterOwner), "function_applied", true, "same_owner_reference", afterOwner == owner,
                    "input_origin", "raw Customers/Visits HTTP bodies captured in this group; targeted Function application"));

                Mono<Visits> fallback = (Mono<Visits>) method(ApiGatewayController.class, "emptyVisitsForPets").invoke(controller);
                Visits empty = fallback.block(Duration.ofSeconds(5));
                if (empty == null) throw new IllegalStateException("Fallback helper returned null");
                save(output, "direct-fallback-return.json", empty);
                event("emptyVisitsForPets_direct_subscription", Map.of("returned", tree(empty), "subscribed", true,
                    "production_callback_traced", false, "scope", "direct private helper only; earlier fault evidence remains separate"));
                event("measurement_completed", Map.of("impact_labels_created", false, "evaluated_method_output", false,
                    "production_method_tracing_claimed", false));
                System.out.println("PAIRED_TARGETED_HELPER_MEASUREMENT_COMPLETED; no impact labels or production callback trace");
            } catch (Exception error) {
                event("measurement_failed", Map.of("exception", error.getClass().getName(), "message", String.valueOf(error.getMessage())));
                throw error;
            }
        }
    }
}
