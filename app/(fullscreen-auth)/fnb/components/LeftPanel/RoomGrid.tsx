import React from "react";
import { Card, Badge, Avatar, Typography } from "antd";
import { ShoppingCartOutlined, ShoppingOutlined } from "@ant-design/icons";
import { Room, OrderItem } from "../../types";
import { COLORS } from "../../constants";
import { formatDuration } from "../../utils";

const { Text } = Typography;

interface RoomGridProps {
    viewDensity: "normal" | "compact";
    displayedRooms: Room[];
    selectedRoomId: string | null;
    orders: Record<string, OrderItem[]>;
    orderStartTimes: Record<string, Date>;
    currentTime: Date;
    handleRoomClick: (room: Room) => void;
}

const RoomGrid: React.FC<RoomGridProps> = ({
    viewDensity,
    displayedRooms,
    selectedRoomId,
    orders,
    orderStartTimes,
    currentTime,
    handleRoomClick,
}) => {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: viewDensity === "normal"
                ? "repeat(auto-fill, minmax(130px, 1fr))"
                : "repeat(auto-fill, minmax(85px, 1fr))",
            gap: viewDensity === "normal" ? 16 : 8,
            transition: "all 0.3s ease"
        }}>
            {/* Takeaway Card */}
            <Card
                hoverable
                styles={{ body: { height: viewDensity === "normal" ? 120 : 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8 } }}
                style={{ borderRadius: 8, background: "#e6f7ff", border: `1px solid ${COLORS.occupiedBorder}` }}
            >
                <Badge count={<ShoppingCartOutlined style={{ color: '#fff', fontSize: viewDensity === "normal" ? 12 : 10 }} />}>
                    <Avatar size={viewDensity === "normal" ? 64 : 40} icon={<ShoppingOutlined />} style={{ backgroundColor: "#cfe9ff", color: COLORS.primary }} />
                </Badge>
                <Text strong style={{ color: "#3467cc", marginTop: viewDensity === "normal" ? 8 : 4, fontSize: viewDensity === "normal" ? 14 : 11 }}>Mang về</Text>
            </Card>

            {displayedRooms.map((room) => {
                const isSelected = selectedRoomId === room.id;
                const roomItems = orders[room.id] || [];
                const hasOrder = roomItems.length > 0;
                const isOccupied = room.status === "occupied" || hasOrder;
                const isReserved = room.status === "reserved";

                // Calculate dynamic price and time
                const totalPrice = roomItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
                const startTime = orderStartTimes[room.id];
                const timeStr = startTime
                    ? formatDuration(startTime, currentTime)
                    : (room.time || "");

                let bg = COLORS.empty;
                let border = `1px solid ${COLORS.emptyBorder}`;
                let textColor = "inherit";

                if (isSelected) {
                    bg = COLORS.primary;
                    border = `1px solid ${COLORS.primary}`;
                    textColor = "#fff";
                } else if (isOccupied) {
                    bg = COLORS.occupied;
                    border = `1px solid ${COLORS.occupiedBorder}`;
                    textColor = COLORS.occupiedText;
                } else if (isReserved) {
                    bg = COLORS.reserved;
                    border = `1px solid ${COLORS.reservedBorder}`;
                    textColor = COLORS.reservedText;
                }

                return (
                    <div key={room.id} style={{ textAlign: "center" }}>
                        <Card
                            hoverable
                            onClick={() => handleRoomClick(room)}
                            styles={{
                                body: {
                                    height: viewDensity === "normal" ? 100 : 70,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: 4,
                                    position: "relative"
                                }
                            }}
                            style={{
                                borderRadius: 16,
                                background: bg,
                                border: border,
                                transition: "all 0.3s",
                                overflow: "hidden"
                            }}
                        >
                            {/* Visual representation of a table top */}
                            <div style={{
                                width: "80%",
                                height: "70%",
                                border: `1.5px solid ${isSelected ? "#fff" : (isOccupied ? COLORS.occupiedBorder : (isReserved ? COLORS.reservedBorder : COLORS.emptyBorder))}`,
                                borderRadius: 12,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                {(totalPrice > 0 || room.price) && (
                                    <Text style={{ fontSize: viewDensity === "normal" ? 11 : 9, color: isSelected ? "#fff" : textColor }}>
                                        {(totalPrice > 0 ? totalPrice : room.price!).toLocaleString()}
                                        {timeStr && <span style={{ marginLeft: 4 }}>{timeStr}</span>}
                                    </Text>
                                )}
                                {room.customers && (
                                    <Text style={{ fontSize: viewDensity === "normal" ? 10 : 8, color: isSelected ? "#fff" : textColor }}>
                                        {room.customers}
                                    </Text>
                                )}
                            </div>
                        </Card>
                        <Text strong style={{ marginTop: 4, display: "block", fontSize: viewDensity === "normal" ? 12 : 10 }}>{room.label}</Text>
                    </div>
                );
            })}
        </div>
    );
};

export default RoomGrid;
