# Parser/importer đã kiểm cho PetClinic

Bản sao nguyên byte từ bàn giao sửa breaker P03 của Hiển ngày 05/11/2026; không thay code ở nhánh Hiển hay sửa hồ sơ cũ. Bố cục `working/` và `packet/` được giữ để tests tìm đúng input.

- Parser SHA-256: `75e5d0fa0b2e958fb8a6604516e95dd24e65905bb6617b3820112d0270438005`.
- Importer SHA-256: `93c20bd93e6dd5997043b4e4806aa5df7523426b4a82e6607b694934e5d4d7d3`.
- [Source](working/src/) · [Tests](working/tests/) · [Dependency khai trong packet](packet/implementation-reference/requirements.txt).
- [Bằng chứng kiểm độc lập](../../evidence/petclinic-20261105/README.md).

Coordinator đã kiểm với Python cache gồm tree-sitter 0.25.2, tree-sitter-java 0.23.5 và neo4j 5.28.1; khác môi trường tác giả bàn giao, đã ghi rõ trong báo cáo. Để kiểm unit trên môi trường có sẵn các dependency đó:

```powershell
cd implementation/petclinic-reviewed-20261105/working
python -B -m unittest discover -s tests -v
```

Unit tests dùng source và unit/mock, không chứng nhận Neo4j thật. Hai DB thật đã được kiểm trong run lưu riêng. Không lấy graph reachability thành behavioral impact; record accessor, nested IDs, serialization/dataflow và các biểu thức breaker ngoài mẫu hỗ trợ vẫn có giới hạn. Không gọi model hoặc tạo điểm CIA trong gói này.
