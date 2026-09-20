// ============================================================================
// Code GraphRAG Cypher Import Script
// Snapshot: None | Commit: None
// ============================================================================

// 1. Schema Constraints
CREATE CONSTRAINT service_name_unique IF NOT EXISTS FOR (s:Service) REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT class_fqn_unique IF NOT EXISTS FOR (c:Class) REQUIRE c.fqn IS UNIQUE;
CREATE CONSTRAINT method_id_unique IF NOT EXISTS FOR (m:Method) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT endpoint_id_unique IF NOT EXISTS FOR (e:Endpoint) REQUIRE e.handler_id IS UNIQUE;

// 2. Clear previous snapshot nodes if needed (Optional: comment out if appending)
// MATCH (n) DETACH DELETE n;

// 3. Import Nodes (Service, Class, Method)
MERGE (s:Service {name: "adservice"});
MERGE (s:Service {name: "cartservice"});
MERGE (s:Service {name: "checkoutservice"});
MERGE (s:Service {name: "currencyservice"});
MERGE (s:Service {name: "emailservice"});
MERGE (s:Service {name: "paymentservice"});
MERGE (s:Service {name: "productcatalogservice"});
MERGE (s:Service {name: "recommendationservice"});
MERGE (s:Service {name: "shippingservice"});

// Link Classes to Services
MERGE (c:Class {fqn: "checkoutservice.main"}) ON CREATE SET c.name = "main", c.file = "data/online_boutique/checkoutservice_main.go";
MATCH (s:Service {name: "checkoutservice"}), (c:Class {fqn: "checkoutservice.main"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "hipstershop.AdService"}) ON CREATE SET c.name = "AdService", c.file = "data/online_boutique/demo.proto";
MATCH (s:Service {name: "adservice"}), (c:Class {fqn: "hipstershop.AdService"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "hipstershop.CartService"}) ON CREATE SET c.name = "CartService", c.file = "data/online_boutique/demo.proto";
MATCH (s:Service {name: "cartservice"}), (c:Class {fqn: "hipstershop.CartService"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "hipstershop.CheckoutService"}) ON CREATE SET c.name = "CheckoutService", c.file = "data/online_boutique/demo.proto";
MATCH (s:Service {name: "checkoutservice"}), (c:Class {fqn: "hipstershop.CheckoutService"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "hipstershop.CurrencyService"}) ON CREATE SET c.name = "CurrencyService", c.file = "data/online_boutique/demo.proto";
MATCH (s:Service {name: "currencyservice"}), (c:Class {fqn: "hipstershop.CurrencyService"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "hipstershop.EmailService"}) ON CREATE SET c.name = "EmailService", c.file = "data/online_boutique/demo.proto";
MATCH (s:Service {name: "emailservice"}), (c:Class {fqn: "hipstershop.EmailService"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "hipstershop.PaymentService"}) ON CREATE SET c.name = "PaymentService", c.file = "data/online_boutique/demo.proto";
MATCH (s:Service {name: "paymentservice"}), (c:Class {fqn: "hipstershop.PaymentService"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "hipstershop.ProductCatalogService"}) ON CREATE SET c.name = "ProductCatalogService", c.file = "data/online_boutique/demo.proto";
MATCH (s:Service {name: "productcatalogservice"}), (c:Class {fqn: "hipstershop.ProductCatalogService"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "hipstershop.RecommendationService"}) ON CREATE SET c.name = "RecommendationService", c.file = "data/online_boutique/demo.proto";
MATCH (s:Service {name: "recommendationservice"}), (c:Class {fqn: "hipstershop.RecommendationService"}) MERGE (s)-[:CONTAINS]->(c);
MERGE (c:Class {fqn: "hipstershop.ShippingService"}) ON CREATE SET c.name = "ShippingService", c.file = "data/online_boutique/demo.proto";
MATCH (s:Service {name: "shippingservice"}), (c:Class {fqn: "hipstershop.ShippingService"}) MERGE (s)-[:CONTAINS]->(c);

// Link Methods to Classes
MERGE (m:Method {id: "cartservice::CartService#AddItem(AddItemRequest)"}) ON CREATE SET m.name = "AddItem", m.parameter_types = ["AddItemRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 24, m.line_end = 24;
MATCH (c:Class {fqn: "hipstershop.CartService"}), (m:Method {id: "cartservice::CartService#AddItem(AddItemRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "cartservice::CartService#GetCart(GetCartRequest)"}) ON CREATE SET m.name = "GetCart", m.parameter_types = ["GetCartRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 25, m.line_end = 25;
MATCH (c:Class {fqn: "hipstershop.CartService"}), (m:Method {id: "cartservice::CartService#GetCart(GetCartRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "cartservice::CartService#EmptyCart(EmptyCartRequest)"}) ON CREATE SET m.name = "EmptyCart", m.parameter_types = ["EmptyCartRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 26, m.line_end = 26;
MATCH (c:Class {fqn: "hipstershop.CartService"}), (m:Method {id: "cartservice::CartService#EmptyCart(EmptyCartRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "recommendationservice::RecommendationService#ListRecommendations(ListRecommendationsRequest)"}) ON CREATE SET m.name = "ListRecommendations", m.parameter_types = ["ListRecommendationsRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 57, m.line_end = 57;
MATCH (c:Class {fqn: "hipstershop.RecommendationService"}), (m:Method {id: "recommendationservice::RecommendationService#ListRecommendations(ListRecommendationsRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "productcatalogservice::ProductCatalogService#ListProducts(Empty)"}) ON CREATE SET m.name = "ListProducts", m.parameter_types = ["Empty"], m.file = "data/online_boutique/demo.proto", m.line_start = 72, m.line_end = 72;
MATCH (c:Class {fqn: "hipstershop.ProductCatalogService"}), (m:Method {id: "productcatalogservice::ProductCatalogService#ListProducts(Empty)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "productcatalogservice::ProductCatalogService#GetProduct(GetProductRequest)"}) ON CREATE SET m.name = "GetProduct", m.parameter_types = ["GetProductRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 73, m.line_end = 73;
MATCH (c:Class {fqn: "hipstershop.ProductCatalogService"}), (m:Method {id: "productcatalogservice::ProductCatalogService#GetProduct(GetProductRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "productcatalogservice::ProductCatalogService#SearchProducts(SearchProductsRequest)"}) ON CREATE SET m.name = "SearchProducts", m.parameter_types = ["SearchProductsRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 74, m.line_end = 74;
MATCH (c:Class {fqn: "hipstershop.ProductCatalogService"}), (m:Method {id: "productcatalogservice::ProductCatalogService#SearchProducts(SearchProductsRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "shippingservice::ShippingService#GetQuote(GetQuoteRequest)"}) ON CREATE SET m.name = "GetQuote", m.parameter_types = ["GetQuoteRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 108, m.line_end = 108;
MATCH (c:Class {fqn: "hipstershop.ShippingService"}), (m:Method {id: "shippingservice::ShippingService#GetQuote(GetQuoteRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "shippingservice::ShippingService#ShipOrder(ShipOrderRequest)"}) ON CREATE SET m.name = "ShipOrder", m.parameter_types = ["ShipOrderRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 109, m.line_end = 109;
MATCH (c:Class {fqn: "hipstershop.ShippingService"}), (m:Method {id: "shippingservice::ShippingService#ShipOrder(ShipOrderRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "currencyservice::CurrencyService#GetSupportedCurrencies(Empty)"}) ON CREATE SET m.name = "GetSupportedCurrencies", m.parameter_types = ["Empty"], m.file = "data/online_boutique/demo.proto", m.line_start = 141, m.line_end = 141;
MATCH (c:Class {fqn: "hipstershop.CurrencyService"}), (m:Method {id: "currencyservice::CurrencyService#GetSupportedCurrencies(Empty)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "currencyservice::CurrencyService#Convert(CurrencyConversionRequest)"}) ON CREATE SET m.name = "Convert", m.parameter_types = ["CurrencyConversionRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 142, m.line_end = 142;
MATCH (c:Class {fqn: "hipstershop.CurrencyService"}), (m:Method {id: "currencyservice::CurrencyService#Convert(CurrencyConversionRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "paymentservice::PaymentService#Charge(ChargeRequest)"}) ON CREATE SET m.name = "Charge", m.parameter_types = ["ChargeRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 178, m.line_end = 178;
MATCH (c:Class {fqn: "hipstershop.PaymentService"}), (m:Method {id: "paymentservice::PaymentService#Charge(ChargeRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "emailservice::EmailService#SendOrderConfirmation(SendOrderConfirmationRequest)"}) ON CREATE SET m.name = "SendOrderConfirmation", m.parameter_types = ["SendOrderConfirmationRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 200, m.line_end = 200;
MATCH (c:Class {fqn: "hipstershop.EmailService"}), (m:Method {id: "emailservice::EmailService#SendOrderConfirmation(SendOrderConfirmationRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "checkoutservice::CheckoutService#PlaceOrder(PlaceOrderRequest)"}) ON CREATE SET m.name = "PlaceOrder", m.parameter_types = ["PlaceOrderRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 225, m.line_end = 225;
MATCH (c:Class {fqn: "hipstershop.CheckoutService"}), (m:Method {id: "checkoutservice::CheckoutService#PlaceOrder(PlaceOrderRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "adservice::AdService#GetAds(AdRequest)"}) ON CREATE SET m.name = "GetAds", m.parameter_types = ["AdRequest"], m.file = "data/online_boutique/demo.proto", m.line_start = 244, m.line_end = 244;
MATCH (c:Class {fqn: "hipstershop.AdService"}), (m:Method {id: "adservice::AdService#GetAds(AdRequest)"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "checkoutservice::main.getUserCart()"}) ON CREATE SET m.name = "getUserCart", m.parameter_types = [], m.file = "data/online_boutique/checkoutservice_main.go", m.line_start = 325, m.line_end = 325;
MATCH (c:Class {fqn: "checkoutservice.main"}), (m:Method {id: "checkoutservice::main.getUserCart()"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "checkoutservice::main.emptyUserCart()"}) ON CREATE SET m.name = "emptyUserCart", m.parameter_types = [], m.file = "data/online_boutique/checkoutservice_main.go", m.line_start = 333, m.line_end = 333;
MATCH (c:Class {fqn: "checkoutservice.main"}), (m:Method {id: "checkoutservice::main.emptyUserCart()"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "checkoutservice::main.convertCurrency()"}) ON CREATE SET m.name = "convertCurrency", m.parameter_types = [], m.file = "data/online_boutique/checkoutservice_main.go", m.line_start = 360, m.line_end = 360;
MATCH (c:Class {fqn: "checkoutservice.main"}), (m:Method {id: "checkoutservice::main.convertCurrency()"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "checkoutservice::main.chargeCard()"}) ON CREATE SET m.name = "chargeCard", m.parameter_types = [], m.file = "data/online_boutique/checkoutservice_main.go", m.line_start = 370, m.line_end = 370;
MATCH (c:Class {fqn: "checkoutservice.main"}), (m:Method {id: "checkoutservice::main.chargeCard()"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "checkoutservice::main.sendOrderConfirmation()"}) ON CREATE SET m.name = "sendOrderConfirmation", m.parameter_types = [], m.file = "data/online_boutique/checkoutservice_main.go", m.line_start = 380, m.line_end = 380;
MATCH (c:Class {fqn: "checkoutservice.main"}), (m:Method {id: "checkoutservice::main.sendOrderConfirmation()"}) MERGE (c)-[:CONTAINS]->(m);
MERGE (m:Method {id: "checkoutservice::main.shipOrder()"}) ON CREATE SET m.name = "shipOrder", m.parameter_types = [], m.file = "data/online_boutique/checkoutservice_main.go", m.line_start = 387, m.line_end = 387;
MATCH (c:Class {fqn: "checkoutservice.main"}), (m:Method {id: "checkoutservice::main.shipOrder()"}) MERGE (c)-[:CONTAINS]->(m);

// 4. Import Endpoints and Link (Method)-[:EXPOSES]->(Endpoint)

// 5. Import Dependency Edges
MATCH (src:Method {id: "checkoutservice::main.getUserCart()"}), (tgt:Method {id: "cartservice::CartService#GetCart(GetCartRequest)"}) MERGE (src)-[r:INVOKES_GRPC {protocol: "gRPC", target_service: "cartservice", target_method: "GetCart", resolution_status: "RESOLVED"}]->(tgt);
MATCH (src:Method {id: "checkoutservice::main.emptyUserCart()"}), (tgt:Method {id: "cartservice::CartService#EmptyCart(EmptyCartRequest)"}) MERGE (src)-[r:INVOKES_GRPC {protocol: "gRPC", target_service: "cartservice", target_method: "EmptyCart", resolution_status: "RESOLVED"}]->(tgt);
MATCH (src:Method {id: "checkoutservice::main.convertCurrency()"}), (tgt:Method {id: "currencyservice::CurrencyService#Convert(CurrencyConversionRequest)"}) MERGE (src)-[r:INVOKES_GRPC {protocol: "gRPC", target_service: "currencyservice", target_method: "Convert", resolution_status: "RESOLVED"}]->(tgt);
MATCH (src:Method {id: "checkoutservice::main.chargeCard()"}), (tgt:Method {id: "paymentservice::PaymentService#Charge(ChargeRequest)"}) MERGE (src)-[r:INVOKES_GRPC {protocol: "gRPC", target_service: "paymentservice", target_method: "Charge", resolution_status: "RESOLVED"}]->(tgt);
MATCH (src:Method {id: "checkoutservice::main.sendOrderConfirmation()"}), (tgt:Method {id: "emailservice::EmailService#SendOrderConfirmation(SendOrderConfirmationRequest)"}) MERGE (src)-[r:INVOKES_GRPC {protocol: "gRPC", target_service: "emailservice", target_method: "SendOrderConfirmation", resolution_status: "RESOLVED"}]->(tgt);
MATCH (src:Method {id: "checkoutservice::main.shipOrder()"}), (tgt:Method {id: "shippingservice::ShippingService#ShipOrder(ShipOrderRequest)"}) MERGE (src)-[r:INVOKES_GRPC {protocol: "gRPC", target_service: "shippingservice", target_method: "ShipOrder", resolution_status: "RESOLVED"}]->(tgt);
