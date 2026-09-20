import os
import pytest
from src.proto_parser import ProtoParser


def test_proto_parser_services_extraction():
    parser = ProtoParser()
    services = parser.parse_proto("data/online_boutique/demo.proto")

    assert len(services) >= 9
    assert "CartService" in services
    assert "CheckoutService" in services
    assert "PaymentService" in services

    cart = services["CartService"]
    assert "GetCart" in cart.methods
    assert "AddItem" in cart.methods
    assert cart.methods["GetCart"].request_type == "GetCartRequest"
    assert cart.methods["GetCart"].response_type == "Cart"


def test_online_boutique_grpc_graph_generation():
    parser = ProtoParser()
    graph = parser.build_online_boutique_graph(
        proto_file_path="data/online_boutique/demo.proto",
        go_client_paths=[("data/online_boutique/checkoutservice_main.go", "checkoutservice")]
    )

    assert len(graph["nodes"]) >= 20
    assert len(graph["edges"]) >= 6

    # Verify edge types and services
    targets = [e["target_id"] for e in graph["edges"]]
    assert any("cartservice::CartService#GetCart" in t for t in targets)
    assert any("paymentservice::PaymentService#Charge" in t for t in targets)
    assert any("currencyservice::CurrencyService#Convert" in t for t in targets)
    assert any("emailservice::EmailService#SendOrderConfirmation" in t for t in targets)
    assert any("shippingservice::ShippingService#ShipOrder" in t for t in targets)

    for edge in graph["edges"]:
        assert edge["type"] == "INVOKES_GRPC"
        assert edge["cross_service"] is True
        assert len(edge["evidence"]) > 0
