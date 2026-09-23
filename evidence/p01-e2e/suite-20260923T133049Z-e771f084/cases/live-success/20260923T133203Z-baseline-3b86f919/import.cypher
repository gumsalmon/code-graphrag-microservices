// ============================================================================
// Code GraphRAG Cypher Import Script
// Snapshot: baseline | Commit: 3858f9c630cf989bb6809a86edf47c2be78dc9f1
// ============================================================================

// 1. Schema Constraints
CREATE CONSTRAINT service_name_unique IF NOT EXISTS FOR (s:Service) REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT class_fqn_unique IF NOT EXISTS FOR (c:Class) REQUIRE c.fqn IS UNIQUE;
CREATE CONSTRAINT method_id_unique IF NOT EXISTS FOR (m:Method) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT endpoint_id_unique IF NOT EXISTS FOR (e:Endpoint) REQUIRE e.handler_id IS UNIQUE;

// 2. Clear previous snapshot nodes if needed (Optional: comment out if appending)
// MATCH (n) DETACH DELETE n;

// 3. Import Nodes (Service, Class, Method)
MERGE (s:Service {name: "api-gateway"});
MERGE (s:Service {name: "visits-service"});

// Link Classes to Services
MERGE (c:Class {fqn: "org.springframework.samples.petclinic.api.application.VisitsServiceClient"}) ON CREATE SET c.name = "VisitsServiceClient", c.file = "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java";
MATCH (s:Service {name: "api-gateway"}), (c:Class {fqn: "org.springframework.samples.petclinic.api.application.VisitsServiceClient"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController"}) ON CREATE SET c.name = "ApiGatewayController", c.file = "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java";
MATCH (s:Service {name: "api-gateway"}), (c:Class {fqn: "org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "org.springframework.samples.petclinic.visits.web.VisitResource"}) ON CREATE SET c.name = "VisitResource", c.file = "spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java";
MATCH (s:Service {name: "visits-service"}), (c:Class {fqn: "org.springframework.samples.petclinic.visits.web.VisitResource"}) MERGE (s)-[:CONTAINS]->(c);

// Link Methods to Classes
MERGE (m:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#create(Visit,int)"}) ON CREATE SET m.name = "create", m.parameter_types = ["Visit", "int"], m.file = "spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java", m.line_start = 56, m.line_end = 65;
MATCH (c:Class {fqn: "org.springframework.samples.petclinic.visits.web.VisitResource"}), (m:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#create(Visit,int)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)"}) ON CREATE SET m.name = "read", m.parameter_types = ["int"], m.file = "spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java", m.line_start = 67, m.line_end = 70;
MATCH (c:Class {fqn: "org.springframework.samples.petclinic.visits.web.VisitResource"}), (m:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)"}) ON CREATE SET m.name = "read", m.parameter_types = ["List<Integer>"], m.file = "spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java", m.line_start = 72, m.line_end = 76;
MATCH (c:Class {fqn: "org.springframework.samples.petclinic.visits.web.VisitResource"}), (m:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)"}) ON CREATE SET m.name = "getVisitsForPets", m.parameter_types = ["List<Integer>"], m.file = "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java", m.line_start = 42, m.line_end = 48;
MATCH (c:Class {fqn: "org.springframework.samples.petclinic.api.application.VisitsServiceClient"}), (m:Method {id: "api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)"}) ON CREATE SET m.name = "getOwnerDetails", m.parameter_types = ["int"], m.file = "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java", m.line_start = 54, m.line_end = 66;
MATCH (c:Class {fqn: "org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController"}), (m:Method {id: "api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)"}) MERGE (c)-[:CONTAINS]->(m);

// 4. Import Endpoints and Link (Method)-[:EXPOSES]->(Endpoint)
MERGE (e:Endpoint {handler_id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#create(Visit,int)"}) ON CREATE SET e.http_method = "POST", e.normalized_path = "/owners/*/pets/{petId}/visits", e.query_parameters = "[]";
MATCH (m:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#create(Visit,int)"}), (e:Endpoint {handler_id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#create(Visit,int)"}) MERGE (m)-[:EXPOSES]->(e);
MERGE (e:Endpoint {handler_id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)"}) ON CREATE SET e.http_method = "GET", e.normalized_path = "/owners/*/pets/{petId}/visits", e.query_parameters = "[]";
MATCH (m:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)"}), (e:Endpoint {handler_id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(int)"}) MERGE (m)-[:EXPOSES]->(e);
MERGE (e:Endpoint {handler_id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)"}) ON CREATE SET e.http_method = "GET", e.normalized_path = "/pets/visits", e.query_parameters = "[{\"name\": \"petId\", \"type\": \"List<Integer>\", \"declared_required\": null, \"effective_required\": true, \"default_value\": null}]";
MATCH (m:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)"}), (e:Endpoint {handler_id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)"}) MERGE (m)-[:EXPOSES]->(e);
MERGE (e:Endpoint {handler_id: "api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)"}) ON CREATE SET e.http_method = "GET", e.normalized_path = "/api/gateway/owners/{ownerId}", e.query_parameters = "[]";
MATCH (m:Method {id: "api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)"}), (e:Endpoint {handler_id: "api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)"}) MERGE (m)-[:EXPOSES]->(e);

// 5. Import Dependency Edges
MATCH (src:Method {id: "api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)"}), (tgt:Method {id: "visits-service::org.springframework.samples.petclinic.visits.web.VisitResource#read(List<Integer>)"}) MERGE (src)-[r:INVOKES_API {target_service: "visits-service", http_method: "GET", normalized_path: "/pets/visits", sent_query_parameters: ["petId"], resolution_status: "RESOLVED", contract_status: "VALID", missing_required_parameters: []}]->(tgt);
MATCH (src:Method {id: "api-gateway::org.springframework.samples.petclinic.api.boundary.web.ApiGatewayController#getOwnerDetails(int)"}), (tgt:Method {id: "api-gateway::org.springframework.samples.petclinic.api.application.VisitsServiceClient#getVisitsForPets(List<Integer>)"}) MERGE (src)-[r:CALLS {has_circuit_breaker: true, fallback_method: "emptyVisitsForPets", resolution_status: "RESOLVED"}]->(tgt);
