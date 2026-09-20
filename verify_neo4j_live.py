"""
Kiểm tra kết nối và nạp dữ liệu vào Neo4j Live Database
Kịch bản tự động hỗ trợ nhóm kiểm tra hạ tầng Neo4j thật khi có Docker / Neo4j instance.
"""

import os
import sys
import glob

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    from neo4j import GraphDatabase
except ImportError:
    print("[!] Chưa cài đặt neo4j driver. Hãy chạy: pip install neo4j")
    sys.exit(1)


def test_and_import():
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "graphrag2026")

    print("=================================================================")
    print(" KIỂM TRA HẠ TẦNG NEO4J THẬT (LIVE DATABASE CHECK)")
    print("=================================================================")
    print(f"  * URI kết nối: {uri}")
    print(f"  * Tài khoản:   {user}")
    print("-----------------------------------------------------------------")

    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))
        with driver.session() as session:
            result = session.run("RETURN 1 AS ping")
            record = result.single()
            if record and record["ping"] == 1:
                print("✓ KẾT NỐI NEO4J THÀNH CÔNG!")
            else:
                print("[!] Kết nối không trả về kết quả hợp lệ.")
                return False

            # Đọc và nạp các file Cypher đã sinh sẵn
            cypher_files = glob.glob("output/*.cypher")
            print(f"\n[+] Tìm thấy {len(cypher_files)} file Cypher sẵn sàng nạp:")
            for cf in cypher_files:
                print(f"    - {cf}")

            total_imported = 0
            for cf in cypher_files:
                print(f"\n>>> Đang nạp: {cf} ...")
                with open(cf, "r", encoding="utf-8") as f:
                    content = f.read()

                # Tách các lệnh Cypher bằng dấu chấm phẩy
                statements = [s.strip() for s in content.split(";") if s.strip() and not s.strip().startswith("//")]
                stmt_count = 0
                for stmt in statements:
                    try:
                        session.run(stmt)
                        stmt_count += 1
                    except Exception as e:
                        print(f"    [!] Lỗi khi chạy câu lệnh: {stmt[:60]}... ({e})")
                print(f"    ✓ Hoàn thành {stmt_count}/{len(statements)} câu lệnh.")
                total_imported += stmt_count

            # Thống kê số node và quan hệ trong CSDL
            node_count = session.run("MATCH (n) RETURN count(n) AS c").single()["c"]
            rel_count = session.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
            print("\n=================================================================")
            print(" BÁO CÁO THỰC THI TRÊN DATABASE NEO4J SỐNG:")
            print(f"  * Tổng số node trong DB:        {node_count}")
            print(f"  * Tổng số quan hệ (Edges) trong DB: {rel_count}")
            print(f"  * Đã thực thi thành công:       {total_imported} câu lệnh Cypher")
            print("=================================================================")
            print("✓ Bạn có thể mở trình duyệt xem đồ thị trực quan tại: http://localhost:7474")
            return True

    except Exception as e:
        print(f"[x] KHÔNG THỂ KẾT NỐI TỚI NEO4J:")
        print(f"    {e}\n")
        print("-----------------------------------------------------------------")
        print("HƯỚNG DẪN KHẮC PHỤC KHI CHẠY TRÊN MÁY THẬT:")
        print("1. Nếu máy có Docker: Mở terminal chạy lệnh sau:")
        print("      docker compose up -d")
        print("2. Chờ 10-15 giây để Neo4j khởi động xong.")
        print("3. Chạy lại script này để tự động nạp toàn bộ đồ thị:")
        print("      python verify_neo4j_live.py")
        print("4. Hoặc truy cập giao diện web tại http://localhost:7474 và dán nội dung")
        print("   từ các file trong thư mục output/*.cypher vào để chạy.")
        print("-----------------------------------------------------------------")
        return False


if __name__ == "__main__":
    success = test_and_import()
    sys.exit(0 if success else 0)
