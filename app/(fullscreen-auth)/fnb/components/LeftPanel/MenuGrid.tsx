import React from "react";
import { Card, Typography } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";
import { ProductApiResponse } from "@/services/productService";
import { Product } from "../../types";

const { Text } = Typography;

interface MenuGridProps {
    products: ProductApiResponse[];
    handleAddProduct: (product: Product) => void;
}

const MenuGrid: React.FC<MenuGridProps> = ({ products, handleAddProduct }) => {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {products.map((product) => (
                <Card
                    key={product.product_id}
                    hoverable
                    onClick={() => handleAddProduct({
                        id: product.product_id,
                        name: product.product_name,
                        price: Number(product.selling_price),
                        category_id: product.category_id,
                        category_name: product.category_name,
                    })}
                    styles={{ body: { padding: 12 } }}
                >
                    <div style={{ height: 100, background: "#f5f5f5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                        <ShoppingOutlined style={{ fontSize: 32, opacity: 0.2 }} />
                    </div>
                    <Text strong style={{ display: "block" }}>{product.product_name}</Text>
                    <Text type="danger">{Number(product.selling_price).toLocaleString()} đ</Text>
                </Card>
            ))}
        </div>
    );
};

export default MenuGrid;
